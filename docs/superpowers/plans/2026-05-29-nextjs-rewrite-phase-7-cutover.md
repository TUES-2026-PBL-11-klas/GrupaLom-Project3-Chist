# Next.js Rewrite — Phase 7: Cutover

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old Vite/nginx `frontend/` with `frontend-next/` everywhere it's referenced — Helm chart, docker-compose, README — then delete the old directory. After Phase 7, both local dev (`docker compose up`) and Kubernetes deploys serve the Next.js app, and the old codebase no longer exists.

**Architecture:** Two existing artifacts already define what the Next.js deployment needs:
1. `frontend-next/Dockerfile` (multi-stage standalone Node runtime, EXPOSE 3000) — built since Phase 1.
2. `helm/values-next.yaml` (staging overlay declaring the image, probes, env vars, port differences) — written in Phase 1 with explicit `PHASE 7 TEMPLATE CHANGES NEEDED` comments calling out the three template gaps.

Phase 7 first patches the three template gaps (parameterise `containerPort`, parameterise `service.targetPort`, add `env:` rendering block), then merges `values-next.yaml`'s overlay into the canonical `helm/frontend-chart/values.yaml`, then swaps `docker-compose.yaml` and `README.md` to point at `frontend-next/`, then deletes `frontend/`. Each task ends in a single commit so the cutover is bisectable; nothing is merged to `main` in this plan — the final task pushes the branch and tags `nextjs-phase-7-complete` for the user to merge manually.

**Tech Stack:** Helm v3 templates, Docker Compose, Kubernetes (existing ArgoCD-managed deployment).

**Spec reference:** `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` §Deployment (lines 232-271) + §Implementation Phases #7 (line 283)
**Prior plan:** `docs/superpowers/plans/2026-05-29-nextjs-rewrite-phase-6-i18n-migration.md`

**Out-of-session items (cannot be executed in this plan, documented for handoff):**
- 24h staging soak — depends on real cluster time.
- Merge `nextjs-rewrite` → `main` — user explicitly deferred.
- ArgoCD repo URL: `argocd/frontend.yaml` currently points at `https://github.com/TUES-2026-PBL-11-klas/Grupa-Lom-Project2-Chist` (the previous repo). The current remote is `Grupa-Lom-Project3-poChist`. If the user wants ArgoCD to roll out Phase 7 automatically, the `repoURL` will need updating to the Project3 repo. Not changed by this plan — operational concern.
- The old `Dockerfile` ARG `VITE_API_URL` env var (in `helm/frontend-chart/values.yaml`) is dropped; the new app uses server-side `BACKEND_URL` only. Anyone with a CI/CD pipeline referencing `VITE_API_URL` must update it after this PR merges.

---

## File Structure

```
helm/
├── frontend-chart/
│   ├── templates/
│   │   ├── deployment.yaml          # MODIFIED: containerPort from values; render env: from .Values.env; probes already rendered
│   │   └── service.yaml             # MODIFIED: targetPort from .Values.service.targetPort (or fall through to containerPort)
│   └── values.yaml                  # REPLACED: full Next.js config (image, port 3000, /api/health probes, BACKEND_URL/etc env)
└── values-next.yaml                 # DELETED: contents merged into values.yaml
docker-compose.yaml                  # MODIFIED: frontend service builds from ./frontend-next, port 3000:3000
README.md                            # MODIFIED: point setup/run at frontend-next; mention "frontend/ removed"
frontend/                            # DELETED: entire old Vite app (Dockerfile, src/, nginx.conf, package.json, etc.)
```

(Argocd manifest `argocd/frontend.yaml` is intentionally NOT modified — see Out-of-session items above.)

---

## Task 1: Parameterise containerPort + service.targetPort in chart

The deployment template hardcodes `containerPort: {{ .Values.service.port }}` (port 80). The service template hardcodes `targetPort: 80`. Both must accept a separate value so the container listens on 3000 while the Service exposes 80.

**Files:**
- Modify: `helm/frontend-chart/templates/deployment.yaml`
- Modify: `helm/frontend-chart/templates/service.yaml`

- [ ] **Step 1: Patch deployment.yaml**

In `helm/frontend-chart/templates/deployment.yaml`, replace the `ports:` block:

```yaml
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
```

with:

```yaml
          ports:
            - name: http
              containerPort: {{ .Values.containerPort | default .Values.service.port }}
              protocol: TCP
```

(The `| default .Values.service.port` keeps the old behaviour when `containerPort` is unset — important because Phase 7 also ships values.yaml separately, and tests should pass against either values file alone.)

- [ ] **Step 2: Patch service.yaml**

In `helm/frontend-chart/templates/service.yaml`, replace:

```yaml
    - port: {{ .Values.service.port }}
      targetPort: 80
```

with:

```yaml
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.targetPort | default .Values.service.port }}
```

- [ ] **Step 3: Lint chart against current values.yaml (still old config)**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
helm lint helm/frontend-chart/
helm template test helm/frontend-chart/ 2>&1 | grep -E "containerPort|targetPort"
```

Expected: `helm lint` passes; rendered output shows `containerPort: 80` (defaulted) and `targetPort: 80` (defaulted) — i.e. behavior unchanged with the old values.yaml.

- [ ] **Step 4: Lint chart against values-next.yaml overlay**

```bash
helm template test helm/frontend-chart/ -f helm/frontend-chart/values.yaml -f helm/values-next.yaml 2>&1 | grep -E "containerPort|targetPort|/api/health"
```

Expected: `containerPort: 3000`, `targetPort: 3000` (after we add the targetPort key), and `path: /api/health` lines appear. (`targetPort: 3000` won't appear yet because values-next.yaml doesn't set `service.targetPort` — that gets fixed in Task 2 below.)

If `containerPort: 3000` does NOT appear, the values-next.yaml `containerPort: 3000` line is still commented out (it was a placeholder). Open `helm/values-next.yaml` and uncomment it:

```yaml
containerPort: 3000
```

Then re-run the template command.

- [ ] **Step 5: Commit**

```bash
git add helm/frontend-chart/templates/deployment.yaml helm/frontend-chart/templates/service.yaml helm/values-next.yaml
git commit -m "feat(helm): parameterise containerPort + service.targetPort for Next.js cutover"
```

---

## Task 2: Add env: rendering in deployment template

The deployment template doesn't render `.Values.env` at all — anything declared in `values.yaml`'s `env:` block is silently dropped. The Next.js app needs `BACKEND_URL`, `NODE_ENV`, `NEXT_TELEMETRY_DISABLED`, `AUTH_COOKIE_SECURE`, `NEXT_PUBLIC_DEFAULT_LOCALE` injected as container env vars.

**Files:**
- Modify: `helm/frontend-chart/templates/deployment.yaml`

- [ ] **Step 1: Add env block to deployment.yaml**

In `helm/frontend-chart/templates/deployment.yaml`, immediately after the `ports:` block (before `livenessProbe`), insert:

```yaml
          {{- with .Values.env }}
          env:
            {{- range $k, $v := . }}
            - name: {{ $k }}
              value: {{ $v | quote }}
            {{- end }}
          {{- end }}
```

- [ ] **Step 2: Verify rendering**

```bash
helm template test helm/frontend-chart/ -f helm/frontend-chart/values.yaml -f helm/values-next.yaml 2>&1 | grep -A 8 "env:"
```

Expected: env vars `NODE_ENV=production` and `NEXT_TELEMETRY_DISABLED=1` appear under `env:`. With the *current* values.yaml (still VITE_API_URL), `VITE_API_URL=http://user-module:8080` also appears — that's fine, it gets cleaned up in Task 3.

- [ ] **Step 3: Lint check still passes**

```bash
helm lint helm/frontend-chart/
helm lint helm/frontend-chart/ -f helm/frontend-chart/values.yaml -f helm/values-next.yaml
```

Both should exit 0.

- [ ] **Step 4: Commit**

```bash
git add helm/frontend-chart/templates/deployment.yaml
git commit -m "feat(helm): render .Values.env as container env vars in frontend deployment"
```

---

## Task 3: Replace values.yaml with Next.js config

Merge `helm/values-next.yaml`'s overlay into the canonical `helm/frontend-chart/values.yaml`, drop the old Vite/nginx settings, delete the now-redundant overlay file.

**Files:**
- Modify: `helm/frontend-chart/values.yaml`
- Delete: `helm/values-next.yaml`

- [ ] **Step 1: Replace values.yaml**

Overwrite `helm/frontend-chart/values.yaml` with:

```yaml
replicaCount: 1
image:
  repository: acrchistdev.azurecr.io/chist-frontend-next
  pullPolicy: Always
  tag: "latest"
containerPort: 3000
env:
  NODE_ENV: "production"
  NEXT_TELEMETRY_DISABLED: "1"
  # BACKEND_URL: in-cluster Spring Boot user-module DNS name.
  BACKEND_URL: "http://user-module:8080"
  AUTH_COOKIE_SECURE: "true"
  NEXT_PUBLIC_DEFAULT_LOCALE: "bg"
imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""
serviceAccount:
  create: true
  automount: true
  annotations: {}
  name: ""
podAnnotations: {}
podLabels: {}
podSecurityContext: {}
securityContext: {}
service:
  type: ClusterIP
  port: 80
  targetPort: 3000
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
  hosts:
    - host: "4.165.174.62.nip.io"
      paths:
        - path: /
          pathType: Prefix
          servicePort: 80
  tls: []
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 3
  targetCPUUtilizationPercentage: 80
volumes: []
volumeMounts: []
nodeSelector: {}
tolerations: []
affinity: {}
httpRoute:
  enabled: false
```

(Keep ingress, hpa, httproute, serviceAccount knobs identical to the prior file — only image, env, containerPort, service.targetPort, livenessProbe, readinessProbe, resources change.)

- [ ] **Step 2: Delete the now-redundant overlay**

```bash
git rm helm/values-next.yaml
```

- [ ] **Step 3: Lint + render**

```bash
helm lint helm/frontend-chart/
helm template prod helm/frontend-chart/ 2>&1 | grep -E "image:|containerPort|targetPort|BACKEND_URL|/api/health" | head -20
```

Expected: image is `acrchistdev.azurecr.io/chist-frontend-next:latest`, containerPort 3000, targetPort 3000, BACKEND_URL present, /api/health on both probes.

- [ ] **Step 4: Commit**

```bash
git add helm/frontend-chart/values.yaml helm/values-next.yaml
git commit -m "feat(helm): swap frontend-chart values.yaml to Next.js (image, port 3000, /api/health probes); drop staging overlay"
```

---

## Task 4: Swap docker-compose to frontend-next

The current `docker-compose.yaml` builds `./frontend` (Vite/nginx, port 80). Swap it to `./frontend-next` (Node standalone, port 3000) and pass `BACKEND_URL` so server actions can reach the user-module.

**Files:**
- Modify: `docker-compose.yaml`

- [ ] **Step 1: Patch the frontend service**

In `docker-compose.yaml`, replace the entire `frontend:` block:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: chist-frontend
    ports:
      - "3000:80"
    depends_on:
      - user-module
      - report-module
      - notification-module
```

with:

```yaml
  frontend:
    build:
      context: ./frontend-next
      dockerfile: Dockerfile
    container_name: chist-frontend
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_TELEMETRY_DISABLED: "1"
      BACKEND_URL: http://user-module:8080
      AUTH_COOKIE_SECURE: "false"
      NEXT_PUBLIC_DEFAULT_LOCALE: bg
    depends_on:
      - user-module
      - report-module
      - notification-module
```

(Note: `AUTH_COOKIE_SECURE` is `"false"` for local dev because the container speaks plain HTTP. The Helm values keep it `"true"` for production.)

- [ ] **Step 2: Validate compose syntax**

```bash
docker compose config 2>&1 | grep -E "frontend|3000" | head -10
```

Expected: `chist-frontend` service rendered, `published: "3000"` and `target: 3000`.

If `docker compose` is not installed (the repo's CI/dev might use only Kubernetes), skip this check and rely on lint via Task 5's build.

- [ ] **Step 3: Build the frontend image standalone to confirm Dockerfile still builds against current code**

```bash
docker build -t chist-frontend-next:cutover-test ./frontend-next 2>&1 | tail -15
```

Expected: image builds successfully. If Docker is unavailable in the dev environment, skip — CI catches this.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yaml
git commit -m "feat(compose): point frontend service at frontend-next (port 3000, Next.js env)"
```

---

## Task 5: Update README

The current README still describes the old setup. Update it to reference `frontend-next`, document the dev/build/test commands, and note that the old `frontend/` has been removed.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README to find what changes**

```bash
grep -n "frontend\|vite\|npm run\|docker compose\|npm install" README.md | head -30
```

Identify lines that mention `frontend/`, Vite, or the old setup commands. Common patterns: install instructions, run instructions, contributing guide.

- [ ] **Step 2: Patch README**

Apply the following edits (search-and-replace each unique string):

| Search for | Replace with |
|---|---|
| `cd frontend` | `cd frontend-next` |
| `./frontend/` (relative paths to old dir) | `./frontend-next/` |
| `Vite` (when describing the frontend stack) | `Next.js 16 (App Router)` |
| `nginx` (when describing how the frontend is served) | `Node standalone runtime` |

If the README has a "Running locally" section that lists `docker compose up`, no change needed — the compose file already points at the new dir after Task 4. If it instructs `npm run dev` from `frontend/`, change to `frontend-next/`.

If the README does NOT reference the frontend directory at all (skim first), add a new "Frontend" section near the top of the Architecture or Setup area:

```markdown
## Frontend

The web frontend is a Next.js 16 App Router application in `frontend-next/`.

Local dev: `cd frontend-next && npm install && npm run dev` → http://localhost:3000

Inside docker-compose: brought up automatically by `docker compose up frontend`.

Tests: `cd frontend-next && npm test` (vitest).
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: point README at frontend-next; describe Next.js stack"
```

---

## Task 6: Delete the old frontend/ directory

The Helm chart, docker-compose, and README no longer reference `frontend/`. Removing the directory is now safe and the only remaining cleanup.

**Files:**
- Delete: entire `frontend/` directory

- [ ] **Step 1: Confirm nothing else references it**

```bash
grep -rn "frontend/" --exclude-dir=frontend --exclude-dir=frontend-next --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -20
```

Expected: only references inside `frontend-next/` paths (e.g. log lines mentioning `frontend-next/`), or docs/historical references in `docs/superpowers/plans/*.md`. Any *active* reference (in a CI workflow, Dockerfile, helm template, script, or top-level config) means you missed an update — fix it before deleting.

If the grep returns lines in `.github/workflows/` referencing `frontend/`, open each workflow file and update the path to `frontend-next/` or delete the workflow if it only built the old app. Add those workflow edits to Task 6's commit.

- [ ] **Step 2: Delete the directory**

```bash
git rm -r frontend/
```

- [ ] **Step 3: Verify working tree**

```bash
git status -s | head -20
ls frontend 2>&1 | head -3   # expect: "No such file or directory"
ls frontend-next             # expect: still present
```

- [ ] **Step 4: Run the Next.js test suite one more time as a sanity check**

```bash
cd frontend-next && npm test 2>&1 | tail -6
```

Expected: 55 passing (unchanged from Phase 6).

- [ ] **Step 5: Commit**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git commit -m "chore: remove legacy Vite frontend/ — superseded by frontend-next/"
```

(This produces a large deletion-only diff; that's expected.)

---

## Task 7: Push branch + tag, document handoff

No merge to main in this plan — user explicitly deferred. Phase 7 ends with a pushed branch + an annotated tag the user can merge on their own schedule, plus a written checklist of what they still need to do manually.

- [ ] **Step 1: Push branch + tag**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git push origin nextjs-rewrite
git tag -a nextjs-phase-7-complete -m "Phase 7 (cutover) complete: Helm chart serves Next.js image on port 3000 with /api/health probes; docker-compose builds frontend-next; old frontend/ removed. NOT merged to main — user-managed."
git push origin nextjs-phase-7-complete
```

- [ ] **Step 2: Print the handoff checklist**

After pushing, print this to the user (do not commit it):

```
Phase 7 is complete on branch `nextjs-rewrite` and tagged `nextjs-phase-7-complete`.

Still owned by you (the user) — not done by this plan:

1. **24h staging soak.** Deploy `helm/frontend-chart/` from the `nextjs-rewrite`
   branch into the staging cluster and let it run for 24h. Watch:
   - Pod readiness (probes hit /api/health)
   - User-module connectivity (BACKEND_URL resolves)
   - Locale switcher round-trip (/bg ↔ /en)
   - Login → reports → claim flow

2. **ArgoCD repo URL.** `argocd/frontend.yaml` currently points at
   `Grupa-Lom-Project2-Chist`. To roll out Phase 7 via ArgoCD, update
   `spec.source.repoURL` to the Project3 repo (or whichever repo
   `nextjs-rewrite` lives on after the main merge).

3. **Image registry.** values.yaml references
   `acrchistdev.azurecr.io/chist-frontend-next:latest`. If your CI pushes the
   old `chist-frontend` image to that registry on merges to main, add a CI step
   that builds and pushes `chist-frontend-next` from `frontend-next/Dockerfile`
   before promoting Phase 7.

4. **Merge to main.** Once staging soak passes:
   ```bash
   git checkout main && git pull && git merge --no-ff nextjs-rewrite
   git push origin main
   ```
   Or open a PR from `nextjs-rewrite` to `main` for review.

5. **Optional cleanup.** Drop `VITE_API_URL` from any CI secrets/workflows;
   it's no longer read by anything in the codebase.
```

---

## Phase 7 Definition of Done

- Helm chart renders cleanly (`helm lint` + `helm template` produce no errors) with the new values.yaml.
- Rendered deployment has `containerPort: 3000`, `BACKEND_URL` env, and `/api/health` on both probes.
- Rendered service has `port: 80, targetPort: 3000`.
- `docker compose config` (if available) shows the frontend service builds `./frontend-next` and publishes `3000:3000`.
- `frontend/` directory no longer exists in the working tree.
- `frontend-next/` still passes `npm test` (55 passing) and `npm run build` (green).
- Branch pushed to origin, tag `nextjs-phase-7-complete` pushed.
- No merge to main performed.

## What's NOT in Phase 7

- 24h staging soak (real wall-clock time).
- Merging `nextjs-rewrite` → `main`.
- Updating `argocd/frontend.yaml` repoURL (operational concern, depends on which repo owns the next deploy).
- Building/pushing the `chist-frontend-next` Docker image to the ACR registry (CI/CD concern).
- Removing the old image tag from the registry.
- Any backend-side changes (Spring Boot stays as-is, per spec §Out of Scope).
