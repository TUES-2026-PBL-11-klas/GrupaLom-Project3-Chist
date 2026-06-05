# Phase B — Backend Connection + Cloud Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire the Next.js frontend to the 4 backend microservices via per-module path routing, deploy it on AKS through the existing Helm/ArgoCD/Terraform stack, and reconcile the rewrite branch's infra so a merge to `dev` doesn't regress the cloud.

**Architecture:** The Next.js app fetches the backend **server-side** (`serverFetch` runs in the Node pod), so backend services stay internal ClusterIP and CORS is a non-issue. `serverFetch` resolves the target service by URL path prefix, using per-module env vars, with the single `BACKEND_URL` retained as a fallback (keeps existing tests/behavior).

**Tech Stack:** Next.js 16, vitest; Helm, ArgoCD (app-of-apps), Terraform (AKS/ACR/AKV/CNPG/RabbitMQ/nginx-ingress).

**Working dir for frontend commands:** `/home/perro/proj/protri/GrupaLom-Project3-Chist/frontend-next`
**Working dir for infra commands:** `/home/perro/proj/protri/GrupaLom-Project3-Chist`

---

## Recon Findings (baseline truth)

- **Backend routing map** (controller `@RequestMapping`):
  - `user-module:8080` → `/api/auth`, `/api/users`
  - `report-module:8081` → `/api/reports`, `/api/tasks`
  - `notification-module:8082` → `/api/notifications`
  - `verification-module` → `/api/verifications`
  - `/api/stats`, `/api/leaderboard` are **not** served (frontend uses `/users/leaderboard` on user-module; `statsApi`/`leaderboardApi.get` are currently unused).
- Backends are ClusterIP only (`ingress.enabled: false`); only the frontend chart has an nginx ingress (`*.nip.io`).
- `serverFetch` builds `${BACKEND_URL}${path}` where `path` already includes the leading segment (e.g. `/reports`). The `.env.example` convention is `BACKEND_URL=http://localhost:8080/api` (includes `/api`), but **`docker-compose.yaml` and the Helm values set `BACKEND_URL=http://user-module:8080` WITHOUT `/api`** — a latent bug to fix.
- On `dev`, the frontend Helm chart deploys the **old Vite app** (`chist-frontend`, `VITE_API_URL`, port 80, health `/`). The Next.js chart values (`chist-frontend-next`, `BACKEND_URL`, `/api/health`, port 3000) exist only on `nextjs-rewrite`.
- On `dev`, ArgoCD apps correctly target `GrupaLom-Project3-Chist@main`. On **`nextjs-rewrite`**, `argocd/*.yaml` still target the **old `Grupa-Lom-Project2-Chist`** repo — a regression.

## ⚠️ Merge Risk (read before executing)

PR #17 (`nextjs-rewrite` → `dev`) contains the **entire** branch divergence, not just the redesign — including the stale Project-2 ArgoCD URLs, an added `helm/backend-chart`, and Terraform module swaps (`akv` → `vault`/`hcp`). Merging as-is would regress `dev`'s working cloud config. **Phase B therefore also reconciles the rewrite branch's infra back to `dev`'s correct baseline** (Tasks 3–5). Decision to confirm with the user during review: re-scope PR #17 to frontend-only, or land Phase B infra reconciliation into the same branch before merge.

---

### Task 1: Per-module backend URL resolver (TDD)

**Files:**
- Create: `frontend-next/src/lib/api/backend-url.ts`
- Create: `frontend-next/src/lib/api/backend-url.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend-next/src/lib/api/backend-url.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { resolveBackendBase } from "./backend-url";

describe("resolveBackendBase", () => {
  beforeEach(() => {
    delete process.env.USER_API_URL;
    delete process.env.REPORT_API_URL;
    delete process.env.NOTIFICATION_API_URL;
    delete process.env.VERIFICATION_API_URL;
    process.env.BACKEND_URL = "http://fallback/api";
  });

  it("routes /auth and /users to USER_API_URL", () => {
    process.env.USER_API_URL = "http://user-module:8080/api";
    expect(resolveBackendBase("/auth/login")).toBe("http://user-module:8080/api");
    expect(resolveBackendBase("/users/me")).toBe("http://user-module:8080/api");
  });

  it("routes /reports and /tasks to REPORT_API_URL", () => {
    process.env.REPORT_API_URL = "http://report-module:8081/api";
    expect(resolveBackendBase("/reports")).toBe("http://report-module:8081/api");
    expect(resolveBackendBase("/tasks/5")).toBe("http://report-module:8081/api");
  });

  it("routes /notifications to NOTIFICATION_API_URL", () => {
    process.env.NOTIFICATION_API_URL = "http://notification-module:8082/api";
    expect(resolveBackendBase("/notifications")).toBe("http://notification-module:8082/api");
  });

  it("routes /verifications to VERIFICATION_API_URL", () => {
    process.env.VERIFICATION_API_URL = "http://verification-module:8083/api";
    expect(resolveBackendBase("/verifications")).toBe("http://verification-module:8083/api");
  });

  it("falls back to BACKEND_URL when the matching module var is unset", () => {
    expect(resolveBackendBase("/reports")).toBe("http://fallback/api");
    expect(resolveBackendBase("/anything/else")).toBe("http://fallback/api");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/api/backend-url.test.ts`
Expected: FAIL — cannot find module `./backend-url`.

- [ ] **Step 3: Implement `frontend-next/src/lib/api/backend-url.ts`**

```ts
import "server-only";

/** Maps a serverFetch path (already prefixed, e.g. "/reports") to the env var
 *  holding the owning module's API base. Falls back to BACKEND_URL when unset,
 *  preserving the original single-origin behaviour. */
const PREFIX_TO_ENV: { prefix: string; env: string }[] = [
  { prefix: "/auth", env: "USER_API_URL" },
  { prefix: "/users", env: "USER_API_URL" },
  { prefix: "/reports", env: "REPORT_API_URL" },
  { prefix: "/tasks", env: "REPORT_API_URL" },
  { prefix: "/notifications", env: "NOTIFICATION_API_URL" },
  { prefix: "/verifications", env: "VERIFICATION_API_URL" },
];

export function resolveBackendBase(path: string): string {
  const match = PREFIX_TO_ENV.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
  const fallback = process.env.BACKEND_URL ?? "";
  if (!match) return fallback;
  return process.env[match.env] || fallback;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/api/backend-url.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/lib/api/backend-url.ts frontend-next/src/lib/api/backend-url.test.ts
git commit -m "feat(api): per-module backend URL resolver with BACKEND_URL fallback"
```

---

### Task 2: Use the resolver in serverFetch

**Files:**
- Modify: `frontend-next/src/lib/api/server.ts`

- [ ] **Step 1: Swap the URL construction**

In `frontend-next/src/lib/api/server.ts`, add the import near the top:

```ts
import { resolveBackendBase } from "./backend-url";
```

Then replace the real-fetch URL line:

```ts
    res = await fetch(`${process.env.BACKEND_URL}${path}`, {
```

with:

```ts
    res = await fetch(`${resolveBackendBase(path)}${path}`, {
```

(The mock-token short-circuit above it is unchanged.)

- [ ] **Step 2: Verify existing + new tests pass**

Run: `npm test -- src/lib/api/server.test.ts src/lib/api/backend-url.test.ts`
Expected: PASS. The existing `server.test.ts` sets only `BACKEND_URL`, so the fallback keeps `http://backend.test/api/users/me` intact.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/api/server.ts src/lib/api/backend-url.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/lib/api/server.ts
git commit -m "feat(api): route serverFetch to per-module backend services"
```

---

### Task 3: Frontend Helm chart — deploy chist-frontend-next with per-module env

**Files:**
- Modify: `helm/frontend-chart/values.yaml`
- Verify: `helm/frontend-chart/templates/deployment.yaml` renders the env block

**Context:** The rewrite branch's `frontend-chart/values.yaml` already targets `chist-frontend-next` with a `BACKEND_URL` env. This task replaces that single var with the per-module set and confirms the deployment template emits them.

- [ ] **Step 1: Set the env block in `helm/frontend-chart/values.yaml`**

Ensure the `image.repository` is `acrchistdev.azurecr.io/chist-frontend-next` and set the `env` map to:

```yaml
env:
  NODE_ENV: "production"
  NEXT_TELEMETRY_DISABLED: "1"
  AUTH_COOKIE_SECURE: "true"
  NEXT_PUBLIC_DEFAULT_LOCALE: "bg"
  # Per-module backend bases (in-cluster ClusterIP DNS, include /api).
  USER_API_URL: "http://user-module:8080/api"
  REPORT_API_URL: "http://report-module:8081/api"
  NOTIFICATION_API_URL: "http://notification-module:8082/api"
  VERIFICATION_API_URL: "http://verification-module:8083/api"
  # Fallback for any unmatched path.
  BACKEND_URL: "http://user-module:8080/api"
```

Keep `service.targetPort: 3000`, `containerPort: 3000`, and the `/api/health` liveness/readiness probes already present on the rewrite chart. Confirm the ingress host matches the cluster's (`*.nip.io`).

- [ ] **Step 2: Confirm the deployment template emits the env map**

Read `helm/frontend-chart/templates/deployment.yaml` and confirm it ranges over `.Values.env` as key/value (the rewrite chart does). If it expects a list, adjust the values to the list form the template expects. Do not change the template's contract beyond what's needed to emit all env keys.

- [ ] **Step 3: Render-test the chart**

Run: `helm template frontend ./helm/frontend-chart | grep -A2 -E "USER_API_URL|REPORT_API_URL|VERIFICATION_API_URL|targetPort|/api/health"`
Expected: all four module URLs, port 3000, and `/api/health` probes appear in the rendered manifest.

- [ ] **Step 4: Commit**

```bash
git add helm/frontend-chart/values.yaml
git commit -m "feat(helm): frontend chart deploys chist-frontend-next with per-module backend env"
```

---

### Task 4: Fix stale ArgoCD repoURLs on the rewrite branch

**Files:**
- Modify: `argocd/frontend.yaml`, `argocd/user-module.yaml`, `argocd/report-module.yaml`, `argocd/notification-module.yaml`, `argocd/verification-module.yaml`, `argocd/cnpg-cluster.yaml`

- [ ] **Step 1: Repoint every app to the Project-3 repo**

In each file above, replace:

```yaml
    repoURL: https://github.com/TUES-2026-PBL-11-klas/Grupa-Lom-Project2-Chist
```

with:

```yaml
    repoURL: https://github.com/TUES-2026-PBL-11-klas/GrupaLom-Project3-Chist
```

(`monitoring.yaml` and any Bitnami/community-chart apps keep their upstream `repoURL` — do not touch those.)

- [ ] **Step 2: Verify no Project-2 references remain**

Run: `grep -rn "Grupa-Lom-Project2-Chist" argocd/ || echo "clean"`
Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add argocd/
git commit -m "fix(argocd): point apps at GrupaLom-Project3-Chist (was stale Project-2 repo)"
```

---

### Task 5: docker-compose local parity (per-module env + /api)

**Files:**
- Modify: `docker-compose.yaml`

- [ ] **Step 1: Replace the frontend service's `BACKEND_URL` with the per-module set**

In `docker-compose.yaml`, under the `frontend` service `environment:`, replace:

```yaml
      BACKEND_URL: http://user-module:8080
```

with:

```yaml
      USER_API_URL: http://user-module:8080/api
      REPORT_API_URL: http://report-module:8081/api
      NOTIFICATION_API_URL: http://notification-module:8082/api
      VERIFICATION_API_URL: http://verification-module:8083/api
      BACKEND_URL: http://user-module:8080/api
```

Add `verification-module` to the compose file's services (mirroring the other backend services, context `./backend/verification-module`, port `8083:8083`, the same DB env) and to the frontend's `depends_on`, since the frontend now references it. If the verification image/Dockerfile is not present locally, note it and leave the env pointing at the service name (the fallback keeps other calls working).

- [ ] **Step 2: Validate compose syntax**

Run: `docker compose -f docker-compose.yaml config >/dev/null && echo "compose valid"`
Expected: `compose valid`.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yaml
git commit -m "feat(compose): per-module backend env for the next frontend"
```

---

### Task 6: Documentation + verification + handoff

**Files:**
- Modify: `frontend-next/.env.example` (document the new vars)

- [ ] **Step 1: Document the env vars**

In `frontend-next/.env.example`, under the `BACKEND_URL` block, add:

```bash
# Per-module backend bases (server-side only). When set, serverFetch routes by
# path prefix; BACKEND_URL is the fallback for unmatched paths.
# USER_API_URL=http://localhost:8080/api
# REPORT_API_URL=http://localhost:8081/api
# NOTIFICATION_API_URL=http://localhost:8082/api
# VERIFICATION_API_URL=http://localhost:8083/api
```

- [ ] **Step 2: Full frontend verification**

Run: `npm run lint && npx tsc --noEmit && npm test && npm run build`
Expected: lint shows only the 2 pre-existing errors; types clean; all tests pass (incl. the 5 new backend-url tests); build succeeds.

- [ ] **Step 3: Render-test all charts touched**

Run: `helm template frontend ./helm/frontend-chart >/dev/null && echo "frontend chart OK"`
Expected: `frontend chart OK`.

- [ ] **Step 4: Commit + push + open PR**

```bash
git add frontend-next/.env.example
git commit -m "docs: document per-module backend env vars"
git push origin nextjs-rewrite
```

Then either fold into PR #17 or open a dedicated PR — **confirm the PR strategy with the user** (see Merge Risk above). Cluster apply (`terraform apply` / ArgoCD sync) is the user's action and is **out of scope for automated execution** — there is no cluster access here. The verification ceiling for this plan is: tests green, build green, `helm template` renders, `docker compose config` validates.

---

## Self-Review

**Spec coverage:**
- "Connect frontend to backend" → Tasks 1–2 (per-module routing) + Task 3/5 (env wiring). ✓
- "Fix virtualization/hosting (cloud)" → Task 3 (frontend chart deploys the Next image correctly), Task 4 (ArgoCD repo fix), Task 5 (compose parity). ✓
- Merge-risk of PR #17 carrying infra divergence → called out explicitly; Tasks 3–4 reconcile it. ✓

**Placeholder scan:** No TBD/TODO; every code/edit step shows concrete content. The one conditional (Task 3 Step 2 / Task 5 verification-module presence) gives an explicit decision rule, not a placeholder. ✓

**Type/consistency:** `resolveBackendBase(path)` signature is identical across `backend-url.ts`, its test, and the `server.ts` call site. Env var names (`USER_API_URL`/`REPORT_API_URL`/`NOTIFICATION_API_URL`/`VERIFICATION_API_URL`) are identical across resolver, tests, Helm values, compose, and `.env.example`. Routing map matches the verified backend `@RequestMapping`s. ✓

**Scope:** Cluster `apply`/sync deliberately excluded (no cluster access); verification ceiling stated. Targeted at the cloud (AKS) path per the user's choice; local compose included only for parity/testing.
