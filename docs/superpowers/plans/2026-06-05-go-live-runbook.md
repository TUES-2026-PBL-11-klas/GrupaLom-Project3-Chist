# Chist — Go-Live Runbook

**Purpose:** One place that says, end to end, how to get the Next.js frontend + microservice backend deployed and working on AKS. Read top to bottom.

**Status legend:** ✅ done · ⏳ ready, needs you · 🔜 after a prior step

---

## 0. Where things stand right now

| Thing | State |
|-------|-------|
| Frontend redesign (auth, nav, sidebar streak, pin-drop map, popup, leaderboard, profile) | ✅ on `dev` (PR #17) |
| Per-module backend routing in `serverFetch` + Helm/compose env + `.env.example` | ✅ on `dev` (PR #19) |
| ArgoCD app manifests (`argocd/*.yaml`) repoURL → Project-3 | ✅ on `dev` |
| App-of-apps **bootstrap** template repoURL → Project-3 (`terraform/.../argocd-apps-values.yaml`) | ✅ on `dev` (PR #21) |
| DevOps reconciliation plan | ✅ doc, PR #20 (open) |
| **Promote `dev` → `main`** (deploys come from `main`) | ⏳ |
| CD builds `chist-frontend-next` image | 🔜 auto on push to `main` |
| `terraform apply` (roll the corrected bootstrap) | ⏳ run from where real state lives |
| ArgoCD sync + smoke test | 🔜 |

**Key architectural fact:** the Next.js app calls the backend **server-side** (in the Node pod). So backend services stay internal ClusterIP, **CORS is not needed**, and the pod reaches each service by DNS. `serverFetch` routes by URL prefix:

| Path prefix | Env var | Service |
|-------------|---------|---------|
| `/auth`, `/users` | `USER_API_URL` | `user-module:8080` |
| `/reports`, `/tasks` | `REPORT_API_URL` | `report-module:8081` |
| `/notifications` | `NOTIFICATION_API_URL` | `notification-module:8082` |
| `/verifications` | `VERIFICATION_API_URL` | `verification-module:8083` |
| anything else | `BACKEND_URL` (fallback) | — |

---

## 1. Tooling (local machine)

You only strictly need **`az` + `kubectl`**. `terraform` runs from wherever your **real state** lives (NOT this agent sandbox — there's no remote backend configured, so applying from the sandbox would try to recreate infra).

Arch note: if `pacman -S` 404s, your package DB is stale — run `sudo pacman -Syu` first (Arch has no partial upgrades).

```bash
sudo pacman -Syu                       # refresh + upgrade (fixes the 404s)
sudo pacman -S kubectl helm jq
sudo pacman -S python-pipx && pipx install azure-cli && pipx ensurepath
```

Auth:
```bash
az login --use-device-code
az account set --subscription <SUBSCRIPTION_ID>
az aks list -o table                   # note the cluster NAME + RESOURCE GROUP
az aks get-credentials -g <RG> -n <AKS>
kubectl -n argocd get applications     # sanity check
```

---

## 2. Go-live steps (in order)

### Step 1 — Promote `dev` → `main`  ⏳
Everything is on `dev`; ArgoCD apps and CD both key off `main`.
```bash
gh pr create --base main --head dev \
  --title "Release: Next.js frontend + per-module backend connectivity + argocd fixes" \
  --body "Promotes the redesign, backend routing, and ArgoCD bootstrap fix to main."
# review, then:
gh pr merge --merge
```

### Step 2 — CD builds & pushes images  🔜 (automatic)
Pushing to `main` triggers `.github/workflows/cd.yaml` (path-filtered). Watch it:
```bash
gh run watch
```
Confirm it pushes `acrchistdev.azurecr.io/chist-frontend-next:latest` (+ `:<sha>`) and any changed backend images. Auth uses AKV (`kv-chist-dev`) via `az keyvault secret show`.

### Step 3 — Apply Terraform (rolls the corrected app-of-apps)  ⏳
From the machine/CI that holds the **real Terraform state**:
```bash
cd terraform
terraform init
terraform plan      # EXPECT: only the app-of-apps repoURL changes to Project-3.
                    # If you see AKS/ACR/AKV/CNPG being destroyed/recreated, STOP —
                    # the state is wrong; do not apply.
terraform apply
```

**Faster alternative if you don't want to apply Terraform now** — patch the live bootstrap directly (any machine with `kubectl`):
```bash
kubectl -n argocd patch application chist-apps --type merge \
  -p '{"spec":{"source":{"repoURL":"https://github.com/TUES-2026-PBL-11-klas/GrupaLom-Project3-Chist"}}}'
```
ArgoCD then reads the Project-3 `argocd/` app set immediately; Terraform reconciles on its next normal apply.

### Step 4 — ArgoCD sync  🔜
```bash
kubectl -n argocd get applications
# all of: frontend, user/report/notification/verification-module, cnpg-cluster, rabbitmq, monitoring
# should be Synced / Healthy. Force if needed:
#   argocd app sync <name>        (CLI)  OR
#   kubectl -n argocd annotate application <name> argocd.argoproj.io/refresh=hard --overwrite
```
The frontend image tag is `latest`; if the pod doesn't pick up a new digest:
```bash
kubectl -n chist rollout restart deploy/frontend-frontend-chart
kubectl -n chist get pods            # frontend + 4 modules Running; CNPG Ready in ns/db
```

### Step 5 — Smoke test (end to end)  🔜
Host comes from `helm/frontend-chart/values.yaml` → `ingress.hosts[0].host` (a `*.nip.io`).
```bash
curl -fsS https://<host>/api/health           # frontend health
```
In a browser at `https://<host>`:
1. **Register + log in** → hits `user-module /api/auth`, `/api/users`.
2. **Reports page** → hits `report-module /api/reports` (proves per-module routing through the Node pod).
3. **Create a report** → POST `report-module`; a notification should fire (RabbitMQ → notification-module).

Confirm routing in logs:
```bash
kubectl -n chist logs deploy/frontend-frontend-chart | grep -E "user-module|report-module"
```

---

## 3. Gotchas / decisions

- **Terraform state is not remote** (`terraform.tf` has no `backend` block). Always apply from where the canonical state is; never from the agent sandbox.
- **`latest` image tag** won't auto-roll on a digest change — `rollout restart`, or pin `image.tag` to the `:<sha>` CD produced for reproducible deploys.
- **verification-module** is on `8083` (compose + Helm aligned).
- **CORS** is intentionally not configured for the new frontend — not needed (server-side fetch). Old Vite CORS env on user-module is harmless.
- **Pre-existing lint debt** (not blocking build): `frontend-next/src/components/reports/MapView.tsx:163`, `.../rewards/RewardsClient.tsx:37`.

## 4. Open PRs
- **#20** — DevOps reconciliation plan (reference doc; its Task 1 bootstrap fix already merged as #21).

## 5. Rollback
- App level: `argocd app rollback <name>` or re-deploy a previous `:<sha>` image tag.
- Git: revert the `dev → main` merge commit; ArgoCD re-syncs to the prior state.

## Related docs
- `docs/superpowers/specs/2026-06-05-frontend-redesign-design.md`
- `docs/superpowers/plans/2026-06-05-frontend-redesign.md`
- `docs/superpowers/plans/2026-06-05-phase-b-backend-hosting.md`
- `docs/superpowers/plans/2026-06-05-devops-reconciliation.md`
