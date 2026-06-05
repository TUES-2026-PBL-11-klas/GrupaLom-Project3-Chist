# Frontend Redesign — Design Spec

**Date:** 2026-06-05
**Branch:** `nextjs-rewrite` → PR to `dev`
**Scope:** Phase A only (visual/layout redesign). Backend connection + virtualization/hosting are a deliberately separate follow-up phase after this PR merges.

## Context

`frontend-next/` is a Next.js 16 (App Router) app: Tailwind v4, shadcn/base-ui, `next-intl` (bg/en), `maplibre-gl`, dark theme with a pink/magenta accent token system already defined in `globals.css` (`bg-card`, `brand-border`, `accent-pink`, `display-heading`, `ambient-orb-*`, entrance animations). Backend wiring already exists (`serverFetch` → `BACKEND_URL`, with a mock dispatcher fallback). This redesign is **presentational/layout only** and reuses the existing token system so nothing looks bolted-on.

## Design Principles / Guardrails

- **Icons:** lucide-react only. No emoji characters anywhere.
- **No API/mapper/data changes.** Reuse existing translation keys; add keys only for genuinely new labels (e.g. "use my location"), and add them to **both** `messages/bg.json` and `messages/en.json`.
- **Responsive:** every change works mobile → desktop. Respect `prefers-reduced-motion` (existing `anim-*` classes already do).
- **Token-driven:** use existing CSS tokens/utilities; avoid new hardcoded hex values (the marker popup's hardcoded slate is exactly the thing being removed).

## Items

### 1. Login / Register — `src/app/[locale]/(auth)/layout.tsx` + `src/components/auth/LoginCard.tsx`

- **Layout:** full-screen gradient backdrop — near-black base with soft pink→magenta radial glows (same family as `ambient-orb-*`), layered behind content via fixed pseudo/orb elements. Replaces the plain black centered box.
- **Card:** from cramped `max-w-md` to a **two-pane `max-w-4xl` panel**, taller and less blocky:
  - **Left brand pane** (`hidden md:flex`): large CHIST logo (lucide `Leaf`), tagline, 2–3 value bullets (lucide icons), subtle glow — fills vertical height so the page reads "lengthy".
  - **Right form pane:** existing tabs/inputs with more vertical breathing room and larger field spacing.
  - Mobile: single column; brand pane hidden, compact logo header retained.

### 2. Navbar — `src/components/nav/Navbar.tsx`

- Remove the `max-w-6xl` cap → **full-width bar** with generous horizontal padding. Distribute: logo left, nav links centered/spread, actions (new report, locale, logout) right. Slightly taller (`h-16`). No new behavior.

### 3. Reports sidebar streak header — `src/components/reports/ReportsClient.tsx`

- Add a header block at the top of the left `aside`, ported in spirit from `main`'s `MapSidebar`: **streak** (lucide `Flame` + `user.streak` days) and **signals count**, styled with the site's card/pink tokens. `user` comes from `AppContext` (`useApp`); `streak` already exists on the `User` model. Falls back gracefully if `user` is absent.

### 4. New-report pin-drop map — new `src/components/reports/LocationPicker.tsx` + `src/components/reports/NewReportForm.tsx`

- Replace the two lat/lng number inputs with an **interactive maplibre map** (same `dark-matter-gl-style`, centered on Sofia `[23.3219, 42.6977]`):
  - Click anywhere to drop/move a single pin; pin reuses the existing marker SVG style for visual consistency.
  - **"Use my location"** button → `navigator.geolocation` → moves pin + recenters; graceful failure if denied/unsupported.
  - Live read-only coordinate readout.
  - Hidden `latitude`/`longitude` inputs keep the existing `createReport` server action contract unchanged (default to Sofia center until the user moves the pin).
- `LocationPicker` is a `dynamic(..., { ssr: false })` client component, mirroring how `MapView` is loaded.

### 5. Marker popup — `src/components/reports/MarkerPopup.tsx` + `.chist-popup` CSS in `src/components/reports/MapView.tsx`

- Replace hardcoded `#0F172A` slate with the site system (`bg-card`/surface, `brand-border`, `accent-pink`, `display-heading`, severity accent already passed in). Update the `.chist-popup` content background, tip color, and close-button colors to match. Keep the severity color accent strip.

### 6. Leaderboard — `src/components/leaderboard/LeaderboardClient.tsx` + page

- Widen to **`max-w-6xl`**. Desktop (`lg`): two columns — left = `Podium` + "your position" card; right = sort tabs + ranked `LeaderRow` list. Stacks to single column on mobile (current order preserved).

### 7. Profile — `src/components/profile/ProfileClient.tsx` + page

- Widen to **`max-w-6xl`** dashboard. Desktop (`lg`): left column = `ProfileHero` + `XpBar` + `StatCards` (identity panel); right column = tab switcher + active tab panel (stats/badges/activity/settings). Stacks to single column on mobile.

## Out of Scope (this PR)

- Backend connection beyond what already exists (mock vs real `BACKEND_URL`).
- Virtualization / hosting (docker-compose, Helm, ArgoCD, Terraform/AKS).
- Any change to API routes, mappers, server actions, or auth flow.

## Success Criteria

- `npm run lint` and `npm run build` pass in `frontend-next/`.
- `npm test` (vitest) passes — no presentational change should break existing route/mapper tests.
- Each of the 7 items visibly matches the description above, mobile and desktop.
- No emoji characters introduced; all icons are lucide-react.
- A PR is opened from `nextjs-rewrite` to `dev`.
