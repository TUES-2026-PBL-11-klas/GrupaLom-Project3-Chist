# DevOps Reconciliation & Deploy Plan

> **For agentic workers:** Repo edits (Tasks 1–2) are executable here and verifiable by inspection. Tasks 3–5 require Azure/cluster access (terraform apply, ArgoCD sync, kubectl) and are a **runbook for the operator**, not automatable in this environment.

**Goal:** Make the Project-3 GitOps stack internally consistent and deploy the merged Next.js frontend + per-module backend connectivity to AKS.

**Context:** After merging `nextjs-rewrite` and backend-connectivity into `dev`, most infra is now coherent: ArgoCD app manifests (`argocd/*.yaml`) point at `GrupaLom-Project3-Chist`, the frontend chart deploys `chist-frontend-next` (port 3000, `/api/health`), CD builds `chist-frontend-next` via AKV auth, and Terraform uses AKV (no leftover vault/hcp). The remaining gaps are below.

---

## Findings (current `dev`)

1. **CRITICAL — app-of-apps bootstrap points at the wrong repo.** `terraform/modules/kubernetes/templates/argocd-apps-values.yaml` sets the bootstrap Application's `repoURL` to the **old `Grupa-Lom-Project2-Chist`**, `path: argocd`, `targetRevision: main`. ArgoCD therefore discovers the `argocd/` app set from the *old* repo, not Project-3. Until fixed, none of the corrected app manifests take effect.
2. **Deploys come from `main`.** Every `argocd/*.yaml` app uses `targetRevision: main`. The frontend rewrite + connectivity are on `dev`. They will not deploy until `dev` is promoted to `main`.
3. **Frontend image tag is `latest`** with `pullPolicy: Always`; CD pushes `:latest` + `:<sha>`. Fine for dev, but a rollout needs a pod restart (or sha-pinned tag) since ArgoCD won't notice a `latest` digest change on its own.
4. Backend module charts wire DB + RabbitMQ via `envFrom: secretRef` (`secret-user`/`secret-report`/… + `rabbitmq-secret`), which Terraform creates in the `chist` namespace — coherent. CNPG runs in `db` namespace; module `DB_URL` must target the CNPG service DNS (verify host).
5. AKS is attached to ACR in Terraform (`module.aks` receives `acr_id`) — image pulls should work via the kubelet identity without `imagePullSecrets` (verify).

---

### Task 1: Fix the app-of-apps bootstrap repoURL (CRITICAL)

**Files:** `terraform/modules/kubernetes/templates/argocd-apps-values.yaml`

- [ ] **Step 1: Repoint the bootstrap to Project-3**

Replace:

```yaml
      repoURL: https://github.com/TUES-2026-PBL-11-klas/Grupa-Lom-Project2-Chist
```

with:

```yaml
      repoURL: https://github.com/TUES-2026-PBL-11-klas/GrupaLom-Project3-Chist
```

- [ ] **Step 2: Verify no stale Project-2 references remain anywhere in infra**

Run: `grep -rn "Grupa-Lom-Project2-Chist" argocd/ terraform/ helm/ .github/ || echo "clean"`
Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add terraform/modules/kubernetes/templates/argocd-apps-values.yaml
git commit -m "fix(argocd): app-of-apps bootstrap points at Project-3 repo"
```

---

### Task 2: Decide & document the promotion flow

**Files:** `docs/superpowers/plans/2026-06-05-devops-reconciliation.md` (this file)

Apps deploy from `main`. Two coherent options — pick one and record it here:

- **A. Promote dev → main (recommended).** Open a `dev → main` PR; on merge, CD builds/pushes images and ArgoCD (watching `main`) syncs. Simple, matches the existing pipeline.
- **B. Point ArgoCD at `dev`.** Change every `argocd/*.yaml` `targetRevision` to `dev` for a staging cluster. Faster iteration, but mixes "in-progress" with "deployed".

- [ ] **Step 1:** Record the chosen option (default: A) and, if B, change `targetRevision` across `argocd/*.yaml` + the bootstrap template, then `grep -L "targetRevision: dev" argocd/*.yaml`.
- [ ] **Step 2:** Commit the decision.

---

### Task 3 (RUNBOOK — needs Azure): apply Terraform

- [ ] `cd terraform && terraform init && terraform plan` — review. The only expected infra change vs current state is the corrected app-of-apps `repoURL` (and `targetRevision` if Option B). Confirm no destructive diffs on AKS/ACR/AKV/CNPG.
- [ ] `terraform apply` — applies the bootstrap fix so ArgoCD reads the Project-3 `argocd/` app set.

---

### Task 4 (RUNBOOK — needs cluster): sync & roll out

- [ ] `kubectl -n argocd get applications` — confirm all 7 apps (frontend, user/report/notification/verification modules, cnpg-cluster, rabbitmq, monitoring) are present and `Synced/Healthy`.
- [ ] If frontend is on `:latest`, force a fresh pull: `kubectl -n chist rollout restart deploy/frontend-frontend-chart`.
- [ ] `kubectl -n chist get pods` — all backend modules + frontend `Running`; CNPG cluster `Ready` in `db`.

---

### Task 5 (RUNBOOK — needs cluster): end-to-end smoke test

- [ ] Browse the frontend host (`https://<nip.io>` from `helm/frontend-chart/values.yaml ingress.hosts`). Page loads.
- [ ] `curl https://<host>/api/health` → healthy (the liveness/readiness path).
- [ ] Register + log in (hits `user-module /api/auth`), then open Reports (`report-module /api/reports`) — confirms per-module routing works through the Next pod. Server logs should show fetches to `user-module:8080/api/...` and `report-module:8081/api/...`.
- [ ] Create a report (POST `report-module`), confirm a notification fires (RabbitMQ → notification-module).

---

## Self-Review

**Spec coverage:** "Fix virtualization/hosting (cloud)" → Task 1 (the one remaining blocking bug) + Task 2 (promotion) + runbook Tasks 3–5 (apply/sync/verify). Backend connectivity itself shipped in PR #19. ✓

**Placeholder scan:** No TBD/TODO. `<sha>`/`<host>`/`<nip.io>` are operator-supplied runtime values, not plan gaps. ✓

**Consistency:** Repo name `GrupaLom-Project3-Chist`, namespaces (`chist`/`db`/`argocd`/`rabbitmq`), and the AKV auth model match what's on `dev`. ✓

**Scope:** In-repo fixes (Tasks 1–2) are executable + verifiable here; cloud apply/sync/smoke (Tasks 3–5) require Azure access and are flagged as operator runbook — verification ceiling stated.
