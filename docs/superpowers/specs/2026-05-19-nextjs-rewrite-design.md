# Next.js Rewrite — Design

**Date:** 2026-05-19
**Scope:** Port the existing Vite + React 19 frontend (`frontend/`) to a Next.js 15 App Router application (`frontend-next/`) with a Tailwind + shadcn/ui-based visual modernization that preserves the existing CHIST brand. Backend (Spring Boot) is unchanged.

## Decisions Captured

| Topic | Decision |
|---|---|
| Scope | Port + redesign (modernized execution, same brand) |
| Visual identity | Keep dark theme + CHIST branding + Cyrillic copy; rebuild with Tailwind + shadcn/ui |
| Deployment | Self-hosted k8s; Next.js `output: "standalone"`; update Helm chart |
| Auth | httpOnly cookie + middleware gate |
| State / data | Server components for reads; AppContext for UI state only; server actions for mutations |
| i18n | next-intl with locale routing (`/bg/...`, `/en/...`) |
| Execution | Greenfield in `frontend-next/`; old `frontend/` stays running until cutover |

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · next-intl · MapLibre GL (client-only via `dynamic({ ssr: false })`) · lucide-react · vitest.

## Directory Layout

```
frontend-next/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (auth)/login/
│   │   │   ├── (app)/
│   │   │   │   ├── reports/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   └── new/
│   │   │   │   ├── leaderboard/
│   │   │   │   ├── profile/
│   │   │   │   └── rewards/
│   │   │   └── layout.tsx
│   │   └── api/
│   │       ├── auth/login/route.ts
│   │       ├── auth/logout/route.ts
│   │       └── auth/register/route.ts
│   ├── components/
│   │   ├── ui/                        # shadcn primitives
│   │   ├── reports/                   # ReportsClient, MapView
│   │   └── nav/                       # Navbar, LocaleSwitcher
│   ├── lib/
│   │   ├── api/server.ts              # serverFetch + typed wrappers
│   │   ├── actions/                   # reports.ts, users.ts, auth.ts
│   │   ├── auth/session.ts            # cookie helpers
│   │   └── mock/                      # MOCK_ME, MOCK_USERS, MOCK_REPORTS
│   ├── context/                       # AppContext (UI state only)
│   ├── i18n/
│   │   ├── routing.ts
│   │   └── request.ts
│   ├── styles/globals.css             # Tailwind + brand @theme tokens + keyframes
│   └── middleware.ts                  # locale + auth composition
├── messages/
│   ├── bg.json
│   └── en.json
├── public/
├── Dockerfile
├── next.config.ts                     # output: "standalone"
├── tailwind.config.ts                 # minimal — tokens live in @theme in globals.css
├── tsconfig.json
└── package.json
```

## Routes & Rendering

| Path | Type | Server fetches | Notes |
|---|---|---|---|
| `/[locale]` | redirect | — | → `/[locale]/reports` |
| `/[locale]/login` | client page | — | Login + register tabs, posts to `/api/auth/login` |
| `/[locale]/reports` | server page | `reportsApi.list()` | Map + sidebar list. `MapView` is `dynamic({ ssr:false })`. |
| `/[locale]/reports/[id]` | server page | `reportsApi.getById()` | Promoted from modal to its own route. |
| `/[locale]/reports/new` | client page | — | Create form, photo upload via server action. |
| `/[locale]/leaderboard` | server page | `usersApi.getLeaderboard()` | Pre-rendered with data; sort tabs are client-interactive. |
| `/[locale]/profile` | server page | `getMe()` + badges + stats | All read server-side. |
| `/[locale]/rewards` | server page | `usersApi.getMe()` | |
| `/api/auth/login` | route handler | — | Proxies to Spring Boot; reads JWT from body; sets httpOnly cookie. Mock-creds branch sets `mock-dev-token`. |
| `/api/auth/logout` | route handler | — | Clears cookie; best-effort calls backend `/auth/logout`. |
| `/api/auth/register` | route handler | — | Same shape as login. |

Layouts:
- `(app)/layout.tsx` — Navbar + container, shared across protected pages.
- `(auth)/layout.tsx` — centered card, login only.

## Auth Flow

**Cookie:** `cw_token`, httpOnly, secure in prod, sameSite=lax, path=/, max-age = JWT exp. Value = raw JWT from Spring Boot.

**Login (real path):**
1. Client posts `{email, password}` to `/api/auth/login`.
2. Route handler POSTs to `${BACKEND_URL}/auth/login`.
3. On success: extract JWT from response body, call `cookies().set("cw_token", token, {httpOnly, secure, sameSite, maxAge})`, return `{ok:true}`.
4. On failure: return `{ok:false, message}`.
5. Client redirects to `/[locale]/reports`.

**Login (mock path):** if `email === "test@chist.bg" && password === "test1234"`, route handler sets `cw_token=mock-dev-token` and returns `{ok:true}` without hitting the backend.

**Register:** same shape against `/api/auth/register`.

**Logout:** `/api/auth/logout` clears the cookie and calls Spring Boot `/auth/logout`. Triggered via a server action.

**Server-side fetch helper (`lib/api/server.ts`):**
```ts
async function serverFetch(path: string, init?: RequestInit) {
  const token = (await cookies()).get("cw_token")?.value;
  if (token === "mock-dev-token") return mockResponse(path, init);
  return fetch(`${process.env.BACKEND_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}
```

**Middleware gate:** any request to `/[locale]/(app)/*` without `cw_token` redirects to `/[locale]/login`. Locale resolution runs first.

**401 handling:** `serverFetch` throws a typed `UnauthorizedError`. The page's `error.tsx` boundary calls a server action that clears the cookie and redirects to login. No `window.location.href` hacks.

## Data Layer

**Three layers, one purpose each:**

1. **`lib/api/server.ts` — read path, server-only.**
   `serverFetch(path, init?)` is the only function that calls the backend. All API wrapper functions (`reportsApi.list`, `usersApi.getMe`, etc.) are reimplemented on top of it, keeping the same names so call sites remain readable.

2. **`lib/actions/*.ts` — mutation path, server actions.**
   One file per domain. Each exports `"use server"` functions that call `serverFetch` and then `revalidatePath(...)`. Client components call these directly — no client `fetch`, no `useEffect` for mutations.

3. **`context/AppContext.tsx` — UI state only, client.**
   Holds `selectedReportId`, `notifications[]`, and list `filters`. Removed: `user`, `reports`, `activityFeed`, `loading` — these come from server components as props.

**Why this split:** the current `AppContext` mixes server state with UI state, causing fetch failures to cascade into logout loops (the bug we fixed earlier this session). Separating them means UI state never depends on fetch success.

**Mock mode:** `serverFetch` checks `cookies().get("cw_token")?.value === "mock-dev-token"` and returns from `lib/mock/index.ts` (ported `MOCK_USERS`, `MOCK_REPORTS`, `MOCK_ME`). Single switch, app-wide.

**Caching:** all server fetches use `cache: "no-store"` initially. `revalidateTag` can be added per-endpoint if specific pages become slow.

## Map Integration

MapLibre is browser-only. In Next it must be:
- A client component (`"use client"`)
- Dynamically imported with `ssr: false`
- CSS imported in the component file, not the global stylesheet

**Three-layer pattern:**
- Server page (`reports/page.tsx`) — does the data fetch.
- Client wrapper (`ReportsClient.tsx`) — holds selected-marker state and renders the list sidebar.
- Map module (`MapView.tsx`) — dynamically imported, contains the actual MapLibre code (port of current `MapContainer.tsx`).

This excludes MapLibre (~200KB) from the initial JS bundle of every other page.

**Data flow for new reports:** create-report server action calls `revalidatePath("/[locale]/reports")` → page re-fetches server-side → `initialReports` prop updates → client diffs and updates markers.

The pre-existing TypeScript errors at `MapContainer.tsx:204,222` are fixed during the port (trivial `parseInt` / string narrowing).

## Styling & Components

**Tailwind v4** uses CSS-first config; tokens live in `globals.css`. The exact hex values below are illustrative — the real values get extracted verbatim from the current `frontend/src/styles/*.css` `:root` block during phase 1:

```css
@theme {
  --color-bg: #0a0a0c;
  --color-surface: rgba(255,255,255,0.03);
  --color-text-1: #f5f5f5;
  --color-text-2: #b5b5b5;
  --color-text-3: #777;
  --color-accent-pink: #ff5d8f;
  --color-accent-green: #34d399;
  --font-display: system-ui, sans-serif;
}
```

So `bg-surface`, `text-text-2`, `border-accent-pink` work as utilities. All existing custom CSS retires; components get restyled with Tailwind during their port.

**shadcn/ui primitives used:** Button, Dialog, Tabs, Toast (Sonner), DropdownMenu, Input, Label, Card, Badge, Skeleton.

**Component modernizations (not rewrites):**
- Hand-rolled `Field` → shadcn `Input` + `Label`, preserving focus-pink behavior.
- Hand-rolled tab buttons → shadcn `Tabs`.
- Custom notification reducer slice → shadcn `Sonner`.
- `.auth__card` styling preserved exactly via Tailwind utilities.
- `.anim-float`, `.anim-fade-up` keyframes ported to `globals.css` as `@keyframes` + utility classes (`animate-float`, `animate-fade-up`).

**Polish commitments (the redesign deliverable):**
- Consistent spacing scale (Tailwind 4/6/8) instead of mixed hardcoded values.
- Real focus rings on every interactive element.
- Typography scale: `text-display`, `text-body`, `text-caption` — no inline `fontSize`.
- 300ms ease transitions on hover/focus across the app.
- `Skeleton`-based loading states.

Colors, layout flow, and branding are not changed without explicit approval.

## i18n (next-intl)

**Locales:** `bg` (default), `en`. URLs prefixed: `/bg/reports`, `/en/leaderboard`. `/` redirects to `/bg/`.

**Catalog format** — flat `t(lang).leaderboardTitle` becomes namespaced JSON:
```json
// messages/bg.json
{
  "Leaderboard": {
    "title": "КЛАСАЦИЯ",
    "you": "ТИ",
    "tabs": { "awards": "НАГРАДИ", "cleanings": "ПОЧИСТВАНИЯ", "points": "ТОЧКИ" }
  }
}
```

**Usage:**
- Server: `const t = await getTranslations("Leaderboard"); <h1>{t("title")}</h1>`
- Client: `const t = useTranslations("Leaderboard");`
- `translateLevel(lang, level)` becomes a lookup in a `Levels` namespace.

**Middleware:** `next-intl/middleware` chained with the auth gate. Order: locale resolution → auth check → render.

**Locale switcher:** Navbar dropdown with lucide `Globe`. Switching uses `router.replace` under the new locale prefix.

## Testing

| Layer | Tool | What we test |
|---|---|---|
| Server actions | vitest | Mock `serverFetch`; assert backend call + `revalidatePath` |
| Route handlers | vitest | `/api/auth/login` mock-creds + real branch; cookie set correctly |
| Client components | vitest + RTL | Forms, tabs, leaderboard sort |
| Mock-mode E2E | Playwright (new, optional) | Full walkthrough as `test@chist.bg` |

Pre-existing failures in `frontend/src/services/api.test.ts` do not carry over — that file covers the old client and is replaced by tests on the new layer.

## Deployment

**Dockerfile (multi-stage):**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`next.config.ts` sets `output: "standalone"`.

**Helm chart changes (in `helm/`):**
- `containerPort: 3000` (was 80)
- New image reference
- `BACKEND_URL` env var (server-side only; never `NEXT_PUBLIC_`)
- Drop the nginx ConfigMap
- Liveness/readiness on `/api/health` (new route handler returning 200)

**Env vars:**
- `BACKEND_URL` — Spring Boot internal URL
- `AUTH_COOKIE_SECURE` — `"true"` in prod, `"false"` in dev
- `NEXT_PUBLIC_DEFAULT_LOCALE` — `"bg"`

**Transition:** during the build-out, Helm gets a second deployment template gated by a values flag. After staging soak, the cutover PR deletes the Vite app and swaps the default deployment to the new image.

## Implementation Phases

Each phase is independently shippable to staging. Merge to main only at phase 7.

1. **Scaffold.** `create-next-app`, add deps, brand `@theme` tokens, next-intl middleware + `[locale]` segment, Dockerfile, staging Helm values. Verify `/bg` and `/en` render placeholders.
2. **Auth.** Route handlers + middleware + `(auth)/login/page.tsx`. Phase 2 also adds a temporary placeholder `(app)/reports/page.tsx` (just "Logged in") so the post-login redirect has somewhere to land — replaced for real in phase 4. Verify mock-creds + bad-creds + good-creds paths.
3. **Data layer + mock.** `serverFetch`, `lib/mock/`, all API wrappers, action skeletons. Verify a temp page renders mock data.
4. **Reports.** App layout + Navbar, list page, detail page, new page, MapView (dynamic import), `createReport` / `claimReport` / `completeReport` actions, fix the pre-existing MapContainer TS errors. Verify full mock walkthrough.
5. **Leaderboard, Profile, Rewards.** Server pages + client interactivity. Verify with mock and against staging backend. Carry forward the Podium `<3 entries` guard.
6. **i18n migration.** Namespace the dictionary, replace all `t(lang).foo` call sites, locale switcher. Verify both locales.
7. **Cutover.** Helm swap, delete `frontend/`, update README + docker-compose, 24h staging soak, merge.

## Out of Scope

- Backend changes (Spring Boot stays as-is).
- Authentication-mechanism changes beyond cookie storage (still JWT).
- New features. Anything not in the current app is a separate spec.
- Theme/brand changes beyond polish commitments above.