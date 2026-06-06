# Go-Live Functionality — Frontend Fixes & Real-Backend Wiring

**Date:** 2026-06-06
**Branch:** `dev`
**Goal:** Make every user-facing functionality work on the **already-hosted**
deployment — real backend + real Postgres, no mock fallback for real users.

This is a living checklist. Items move `[ ] → [x]` as they land. Anything marked
**HOSTED** is something that must also be true in the deployed environment, not
just locally.

---

## 0. Context

- Frontend: `frontend-next` (Next.js App Router, next-intl bg/en, maplibre).
- Backend: 4 Spring Boot modules behind **no gateway** — the frontend routes
  server-side per path prefix (`backend-url.ts`):
  - `/auth`, `/users` → `USER_API_URL` (user-module :8080)
  - `/reports`, `/tasks` → `REPORT_API_URL` (report-module :8081)
  - `/notifications` → `NOTIFICATION_API_URL` (notification-module :8082)
  - `/verifications` → `VERIFICATION_API_URL` (verification-module :8083)
  - fallback → `BACKEND_URL`
  - **Every URL must include the `/api` context path.**
- Persistence: Postgres `appdb` (docker-compose `db` service). RabbitMQ for the
  async event bus (task completion → verification → points/notifications).
- Mock mode stays as a dev-only convenience: logging in as
  `test@chist.bg / test1234` issues `mock-dev-token`, which short-circuits to the
  in-memory dispatcher. **Real users (any other email) hit the real backend.**

---

## 1. Frontend UI fixes (this session)

- [x] **Responsive reports view.** On narrow screens the list and map can't share
  the viewport, so the map was 0px tall. Added a mobile list/map toggle in
  `ReportsClient.tsx` (`md:hidden` pill, `Map`/`List` lucide icons). On `md+`
  both panes still show side-by-side. Added `min-h-0` to the map pane.
  - New i18n keys `Reports.showMap` / `Reports.showList` (en + bg).
- [x] **Map popup close button overlapped the date.** Added `pr-9` to the
  `MarkerPopup` header so the date clears the maplibre close button.
- [x] **"Confirm sighting" button was white-on-white.** Root cause: the shadcn
  `outline` variant relies on a `.dark` class the app never sets, so it rendered
  `bg-background` (white) + inherited white text. Fixed the `outline` variant in
  `ui/button.tsx` to use the app's always-dark tokens
  (`border-brand-border bg-bg-card text-text-1 hover:bg-bg-card-hover`). Also
  fixes the dialog cancel button (rewards claim modal).
- [x] **Language switcher dropdown white-on-white.** The `<option>`s used
  `bg-bg-card` (≈transparent) → white-on-white in the native popup. Switched to a
  solid `#0f0f0f` background via inline style in `LocaleSwitcher.tsx`.

## 2. Claim → Complete → Points (real backend, instant)

Decision: **status-based instant points** (not the async photo/verification path).
`PATCH /api/reports/{id}/status?status=CLEANED` with `X-User-Id` (added by
`serverFetch` from the JWT) awards `POINTS_PER_COMPLETION = 50` synchronously via
the user-module internal endpoint and returns the updated report.

- [x] API client routes claim/complete to the status endpoint (`api/index.ts`,
  already committed on `dev`): claim → `IN_PROGRESS`, complete → `CLEANED`.
- [x] `actions/reports.ts` wrappers + `revalidatePath` for the reports list and
  detail pages.
- [x] Report detail page shows **Claim** (status open) and **Mark complete**
  (status in-progress); completing flips the report to done.
- [x] **Points feedback toast.** `completeReport` returns the awarded amount;
  the detail page's complete action `redirect`s to `?earned=50`; the new client
  `CompletionToast` reads the param, pushes a success notification
  (`NotificationBridge`), and strips the query. New i18n key
  `ReportDetail.pointsEarned` (en + bg). Note: `POINTS_PER_COMPLETION` is a
  non-exported const — `actions/reports.ts` is `"use server"`, so every *export*
  must be an async function (a stray `export const` makes the whole module export
  nothing and breaks the build).
- [x] **"Confirm sighting" button removed.** It mapped to `CLEANED` (silently
  completing + awarding points), and there is no real "confirm sighting" endpoint.
  Removed the button, the `confirmReport` action, and `reportsApi.confirm`.
- [x] **Claim button restyled** to the bordered look with hover: white background,
  **black text by default, magenta on hover**, subtle hover background
  (`border border-brand-border bg-white text-black hover:bg-bg-card-hover
  hover:text-magenta`).

## 3. Real-backend connectivity (users, register, reports)

Most of this is already wired — verifying it holds end-to-end.

- [x] **Register a new user.** `POST /api/auth/register` via `app/api/auth/register`
  → user-module persists to Postgres, returns JWT. Frontend stores it in the
  `cw_token` httpOnly cookie.
- [x] **Login.** `POST /api/auth/login` (same pattern).
- [x] **Create a new report.** `NewReportForm` → `createReport` action →
  `POST /api/reports` (multipart, image saved to report-module upload volume).
- [x] **Fetch users / leaderboard** from the DB (`/users/leaderboard`, `/users/me`).
- [x] **Local dev `.env.local`.** Added `frontend-next/.env.local` (gitignored)
  pointing at localhost:8080–8083, each with `/api`, for `npm run dev` against a
  locally-running backend. **HOSTED:** the deployed frontend already gets these
  via docker-compose / Helm env — confirm they are present and correct in the
  hosted environment (see §5).
- [ ] **`/api` prefix sanity.** `login`/`register` routes use `BACKEND_URL`
  directly (must point at the user-module **with `/api`**). Everything else uses
  the per-module vars. Confirm both forms resolve correctly in the hosted env.

## 4. Verification gate (run before commit)

From `frontend-next/`:
- [x] `npx tsc --noEmit` — clean.
- [x] `npm test` — these changes add **no new failures**. 3 failures are
  pre-existing on clean `dev` (verified by stashing): `server.test.ts` body
  double-read, plus `session.test.ts` / auth `route.test.ts` collection errors.
- [x] `npm run build` — succeeds (21 routes).

## 5. Hosted-environment checklist (so it works where it's deployed)

- [ ] Hosted frontend has `USER_API_URL`, `REPORT_API_URL`,
  `NOTIFICATION_API_URL`, `VERIFICATION_API_URL`, `BACKEND_URL` set **with `/api`**
  and reachable from the frontend pod/container.
- [ ] `AUTH_COOKIE_SECURE=true` on HTTPS (so the `cw_token` cookie is sent).
- [ ] report-module → user-module internal points call
  (`USER_SERVICE_URL=http://user-module:8080`) reachable in the hosted network.
- [ ] Postgres reachable by all modules; RabbitMQ up (task/points/notification
  events). Smoke test on the host: register → create report → claim → complete →
  points increment on profile.

## 6. Open decisions

- Whether to keep the async photo/verification path (100 pts) available later in
  addition to the instant 50-pt status path.
