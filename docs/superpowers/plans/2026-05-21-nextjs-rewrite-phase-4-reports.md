# Next.js Rewrite — Phase 4: Reports UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 3 reports placeholder with a real reports experience — Navbar, sidebar list, MapLibre map with severity-coloured markers and popups, report detail page, create-report form, claim/complete server actions wired into the UI. By the end of Phase 4 the mock walkthrough lets you log in, see all 7 mock reports as markers on a Sofia-centred dark map, click one, see its detail page, and submit a (mock) new report through the form.

**Architecture:** Server components fetch + map the data, client components render and handle interaction. Three new pieces are noteworthy:

1. **`AppContext`** (client) holds *only* UI state: `selectedReportId`, `filters`, `notifications`. Server-fetched data flows in as props, never into the context — fixes the design-doc-level bug from the old app where fetch failures cascaded into logout loops.
2. **`MapView`** is dynamically imported with `ssr: false`. MapLibre touches `window`/WebGL on import, so it must not be in the server bundle. This is a port of `frontend/src/components/MapContainer.tsx` with the pre-existing `number` vs `string | number` ID typing fixed.
3. **`createReport`/`claimReport`/`completeReport`** server actions (skeletons exist from Phase 3) now get wired into the new + detail pages. Each calls `revalidatePath` so the reports list re-fetches server-side after a mutation.

**Tech Stack:** Next.js 16 App Router, MapLibre GL 5, shadcn primitives (existing + Dialog, Textarea), lucide-react, vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` §2, §4, §5
**Prior plan:** `docs/superpowers/plans/2026-05-20-nextjs-rewrite-phase-3-data-layer.md`
**Source of truth for ports:** `frontend/src/components/{MapContainer,Navbar}.tsx`, `frontend/src/pages/ReportsView.tsx`, `frontend/src/context/AppContext.tsx`.

---

## File Structure

```
frontend-next/src/
├── lib/api/
│   ├── mappers.ts                       # mapApiUser, mapApiReport, types (TDD)
│   └── mappers.test.ts
├── context/
│   └── AppContext.tsx                   # client, UI state only
├── components/
│   ├── nav/Navbar.tsx                   # top nav with brand + logout
│   ├── reports/
│   │   ├── ReportsClient.tsx            # client: sidebar + selected-state + dynamic MapView
│   │   ├── MapView.tsx                  # client, dynamic-imported MapLibre port
│   │   ├── ReportCard.tsx               # client: list-row card
│   │   └── FilterChips.tsx              # client: severity / status chips
│   └── ui/                              # shadcn primitives — add: textarea, dialog
└── app/[locale]/(app)/
    ├── layout.tsx                       # MODIFIED: Navbar + AppContext provider
    ├── reports/
    │   ├── page.tsx                     # MODIFIED: fetch + map + pass to ReportsClient
    │   ├── [id]/page.tsx                # NEW: report detail + claim/complete buttons
    │   └── new/page.tsx                 # NEW: client form, submits FormData to createReport action
    └── ...
```

---

## Task 1: Mappers (TDD)

**Files:**
- Create: `frontend-next/src/lib/api/mappers.ts`
- Create: `frontend-next/src/lib/api/mappers.test.ts`

Port `mapApiUser` and `mapApiReport` from `frontend/src/context/AppContext.tsx:115-165`, returning typed objects the UI consumes. Includes `deriveLevel` for the level/icon/nextLevelPts triple.

- [ ] **Step 1: Write failing tests**

`frontend-next/src/lib/api/mappers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapApiUser, mapApiReport, deriveLevel } from "./mappers";

describe("deriveLevel", () => {
  it("returns НОВИЧ for 0-499 points", () => {
    expect(deriveLevel(0)).toMatchObject({ level: "НОВИЧ", levelIcon: "sprout", nextLevelPts: 500 });
    expect(deriveLevel(499)).toMatchObject({ level: "НОВИЧ" });
  });
  it("returns АКТИВЕН for 500-1499", () => {
    expect(deriveLevel(500).level).toBe("АКТИВЕН");
    expect(deriveLevel(1499).level).toBe("АКТИВЕН");
  });
  it("returns ПРО / МАСТЪР / ЛЕГЕНДА at the right thresholds", () => {
    expect(deriveLevel(1500).level).toBe("ПРО");
    expect(deriveLevel(3000).level).toBe("МАСТЪР");
    expect(deriveLevel(5000).level).toBe("ЛЕГЕНДА");
  });
});

describe("mapApiUser", () => {
  it("maps API user fields and derives level", () => {
    const u = mapApiUser({
      id: "u1",
      username: "TestUser",
      email: "t@x",
      points: 250,
      streak: 3,
      role: "VerifiedUser",
      cleanings: 2,
      reports: 4,
      createdAt: "2025-09-12T10:00:00Z",
    });
    expect(u.id).toBe("u1");
    expect(u.name).toBe("TestUser");
    expect(u.points).toBe(250);
    expect(u.level).toBe("НОВИЧ");
    expect(u.verified).toBe(true);
    expect(u.avatar).toBe("TE");
  });

  it("falls back gracefully when fields missing", () => {
    const u = mapApiUser({});
    expect(u.id).toBe("");
    expect(u.name).toBe("");
    expect(u.avatar).toBe("??");
    expect(u.points).toBe(0);
    expect(u.verified).toBe(false);
  });
});

describe("mapApiReport", () => {
  it("maps fields and normalizes status", () => {
    const r = mapApiReport({
      reportId: "r-1",
      description: "Препълнен контейнер пред блок 24, отпадъци разпилени по тротоара",
      latitude: 42.7,
      longitude: 23.3,
      district: "Лозенец",
      status: "IN_PROGRESS",
      severity: "high",
      reporterName: "EcoMaria",
      createdAt: "2026-05-17T09:12:00Z",
    });
    expect(r.id).toBe("r-1");
    expect(r.status).toBe("in-progress");
    expect(r.severity).toBe("high");
    expect(r.lat).toBeCloseTo(42.7);
    expect(r.gps).toEqual({ lat: 42.7, lng: 23.3 });
    expect(r.title.length).toBeLessThanOrEqual(50);
    expect(r.reporterAvatar).toBe("EC");
  });

  it("normalizes DONE -> done, OPEN -> open, defaults to open", () => {
    expect(mapApiReport({ reportId: "x", status: "DONE" }).status).toBe("done");
    expect(mapApiReport({ reportId: "x", status: "OPEN" }).status).toBe("open");
    expect(mapApiReport({ reportId: "x", status: "WEIRD" }).status).toBe("open");
  });
});
```

- [ ] **Step 2: Confirm fail**

```bash
cd frontend-next && npm test -- src/lib/api/mappers.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement**

`frontend-next/src/lib/api/mappers.ts`:

```ts
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  points: number;
  streak: number;
  level: string;
  levelIcon: string;
  nextLevelPts: number;
  verified: boolean;
  cleanings: number;
  reports: number;
  joined: string;
}

export interface Report {
  id: string;
  reportId?: string;
  title: string;
  location: string;
  district: string;
  lat: number;
  lng: number;
  status: "open" | "in-progress" | "done";
  severity: string;
  reporter: string;
  reporterAvatar: string;
  time: string;
  description: string;
  gps: { lat: number; lng: number };
  photoUrl?: string | null;
}

const LEVEL_THRESHOLDS = [
  { level: "НОВИЧ", icon: "sprout", min: 0, max: 499 },
  { level: "АКТИВЕН", icon: "award", min: 500, max: 1499 },
  { level: "ПРО", icon: "medal", min: 1500, max: 2999 },
  { level: "МАСТЪР", icon: "gem", min: 3000, max: 4999 },
  { level: "ЛЕГЕНДА", icon: "trophy", min: 5000, max: Infinity },
];

export function deriveLevel(points: number) {
  const lvl = LEVEL_THRESHOLDS.find((l) => points >= l.min && points <= l.max) ?? LEVEL_THRESHOLDS[0];
  const next = LEVEL_THRESHOLDS.find((l) => l.min > points);
  return { level: lvl.level, levelIcon: lvl.icon, nextLevelPts: next?.min ?? lvl.max };
}

export function mapApiUser(data: Record<string, unknown> = {}): User {
  const username = (data.username as string) ?? "";
  const pts = (data.points as number) ?? 0;
  const { level, levelIcon, nextLevelPts } = deriveLevel(pts);
  const createdAt = data.createdAt as string | undefined;
  return {
    id: (data.id as string) ?? "",
    name: username,
    email: (data.email as string) ?? "",
    avatar: (username || "??").slice(0, 2).toUpperCase(),
    points: pts,
    streak: (data.streak as number) ?? 0,
    level,
    levelIcon,
    nextLevelPts,
    verified: data.role === "VerifiedUser",
    cleanings: (data.cleanings as number) ?? 0,
    reports: (data.reports as number) ?? 0,
    joined: createdAt ? new Date(createdAt).toLocaleDateString("bg-BG", { month: "long", year: "numeric" }) : "",
  };
}

export function mapApiReport(data: Record<string, unknown>): Report {
  const sev = ((data.severity as string) ?? "medium").toLowerCase();
  const desc = (data.description as string) ?? "";
  const reporterName = (data.reporterName as string) ?? "";
  const lat = (data.latitude as number) ?? 0;
  const lng = (data.longitude as number) ?? 0;
  const id = ((data.reportId as string) ?? (data.id as string) ?? "");
  const createdAt = data.createdAt as string | undefined;

  const rawStatus = ((data.status as string) ?? "open").toUpperCase();
  let status: Report["status"] = "open";
  if (rawStatus === "IN_PROGRESS" || rawStatus === "IN-PROGRESS") status = "in-progress";
  else if (rawStatus === "DONE" || rawStatus === "COMPLETED") status = "done";
  else if (rawStatus === "OPEN" || rawStatus === "NEW") status = "open";

  return {
    id,
    reportId: data.reportId as string | undefined,
    title: desc ? desc.slice(0, 50) : "Сигнал",
    location: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    district: (data.district as string) ?? "София",
    lat,
    lng,
    status,
    severity: sev,
    reporter: reporterName,
    reporterAvatar: (reporterName || "??").slice(0, 2).toUpperCase(),
    time: createdAt ? new Date(createdAt).toLocaleDateString("bg-BG") : "",
    description: desc,
    gps: { lat, lng },
    photoUrl: (data.photoUrl as string | null) ?? null,
  };
}
```

- [ ] **Step 4: Pass + commit**

```bash
npm test -- src/lib/api/mappers.test.ts
# Expected: 7 tests pass
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git add frontend-next/src/lib/api/mappers.ts frontend-next/src/lib/api/mappers.test.ts
git commit -m "feat(next): port mapApiUser + mapApiReport + deriveLevel to mappers.ts"
```

---

## Task 2: AppContext (UI state only)

**Files:**
- Create: `frontend-next/src/context/AppContext.tsx`

Replaces nothing — Phase 3 didn't add one. This context only holds client-side UI state. Server data (user, reports) lives in props.

- [ ] **Step 1: Write the provider**

`frontend-next/src/context/AppContext.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";

export interface Notification {
  id: number;
  type?: "success" | "info" | "error";
  message: string;
  duration?: number;
}

export interface Filters {
  severity: string | null;
  status: string | null;
}

interface UIState {
  selectedReportId: string | null;
  filters: Filters;
  notifications: Notification[];
}

type UIAction =
  | { type: "SELECT_REPORT"; payload: string | null }
  | { type: "SET_FILTER_SEVERITY"; payload: string | null }
  | { type: "SET_FILTER_STATUS"; payload: string | null }
  | { type: "PUSH_NOTIFICATION"; payload: Omit<Notification, "id"> }
  | { type: "DISMISS_NOTIFICATION"; payload: number };

const initialState: UIState = {
  selectedReportId: null,
  filters: { severity: null, status: null },
  notifications: [],
};

function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SELECT_REPORT":
      return { ...state, selectedReportId: action.payload };
    case "SET_FILTER_SEVERITY":
      return { ...state, filters: { ...state.filters, severity: action.payload } };
    case "SET_FILTER_STATUS":
      return { ...state, filters: { ...state.filters, status: action.payload } };
    case "PUSH_NOTIFICATION":
      return {
        ...state,
        notifications: [...state.notifications, { ...action.payload, id: Date.now() + Math.random() }],
      };
    case "DISMISS_NOTIFICATION":
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.payload) };
  }
}

interface AppContextValue extends UIState {
  selectReport: (id: string | null) => void;
  setSeverityFilter: (sev: string | null) => void;
  setStatusFilter: (s: string | null) => void;
  pushNotification: (n: Omit<Notification, "id">) => void;
  dismissNotification: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      selectReport: (id) => dispatch({ type: "SELECT_REPORT", payload: id }),
      setSeverityFilter: (sev) => dispatch({ type: "SET_FILTER_SEVERITY", payload: sev }),
      setStatusFilter: (s) => dispatch({ type: "SET_FILTER_STATUS", payload: s }),
      pushNotification: (n) => dispatch({ type: "PUSH_NOTIFICATION", payload: n }),
      dismissNotification: (id) => dispatch({ type: "DISMISS_NOTIFICATION", payload: id }),
    }),
    [state]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
```

- [ ] **Step 2: Sanity-build + commit**

```bash
cd frontend-next && ./node_modules/.bin/tsc --noEmit
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git add frontend-next/src/context/AppContext.tsx
git commit -m "feat(next): AppContext for UI state (selectedReportId, filters, notifications)"
```

---

## Task 3: Navbar component

**Files:**
- Create: `frontend-next/src/components/nav/Navbar.tsx`
- Modify: `frontend-next/messages/{bg,en}.json` — add `Nav` namespace

A simple top bar: CHIST wordmark + page links + Log out button. Phase 6 adds the locale switcher; we leave room for it.

- [ ] **Step 1: Add Nav namespace to bg.json**

After the existing `Auth` block, before the closing `}`:

```json
,"Nav": {
  "reports": "СИГНАЛИ",
  "leaderboard": "КЛАСАЦИЯ",
  "profile": "ПРОФИЛ",
  "rewards": "НАГРАДИ",
  "newReport": "НОВ СИГНАЛ",
  "logout": "ИЗХОД"
}
```

- [ ] **Step 2: Add same Nav namespace to en.json**

```json
,"Nav": {
  "reports": "REPORTS",
  "leaderboard": "LEADERBOARD",
  "profile": "PROFILE",
  "rewards": "REWARDS",
  "newReport": "NEW REPORT",
  "logout": "LOG OUT"
}
```

- [ ] **Step 3: Build Navbar**

`frontend-next/src/components/nav/Navbar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Leaf, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

export function Navbar() {
  const t = useTranslations("Nav");
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const pathname = usePathname();

  const links = [
    { href: `/${locale}/reports`, label: t("reports") },
    { href: `/${locale}/leaderboard`, label: t("leaderboard") },
    { href: `/${locale}/rewards`, label: t("rewards") },
    { href: `/${locale}/profile`, label: t("profile") },
  ];

  const logoutAction = logout.bind(null, locale);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-bg-base/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={`/${locale}/reports`} className="flex items-center gap-2">
          <span className="rounded-full bg-accent-pink-dim border border-accent-pink-border p-1.5 text-accent-pink">
            <Leaf size={16} strokeWidth={1.8} />
          </span>
          <span className="text-text-1 text-xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
            CHIST
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`px-3 py-1.5 rounded-md text-xs uppercase tracking-wider transition ${
                    active
                      ? "text-accent-pink bg-accent-pink-dim"
                      : "text-text-2 hover:text-text-1 hover:bg-brand-primary-dim"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="default" className="hidden sm:inline-flex">
            <Link href={`/${locale}/reports/new`}>
              <Plus size={14} strokeWidth={2} />
              {t("newReport")}
            </Link>
          </Button>
          <form action={logoutAction}>
            <Button type="submit" size="sm" variant="ghost" className="gap-1.5">
              <LogOut size={14} />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </form>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/components/nav frontend-next/messages
git commit -m "feat(next): Navbar with brand wordmark, page links, logout"
```

---

## Task 4: Integrate AppContext + Navbar into (app) layout

**Files:**
- Modify: `frontend-next/src/app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: Update the layout**

`frontend-next/src/app/[locale]/(app)/layout.tsx`:

```tsx
import { AppProvider } from "@/context/AppContext";
import { Navbar } from "@/components/nav/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen">
        <Navbar />
        {children}
      </div>
    </AppProvider>
  );
}
```

- [ ] **Step 2: Smoke-test**

Start dev. Visit `/bg/reports` as the mock user. Expected: top nav appears with CHIST mark, 4 nav links, NEW REPORT button, LOG OUT button. No console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/app/\[locale\]/\(app\)/layout.tsx
git commit -m "feat(next): wire AppContext + Navbar into (app) layout"
```

---

## Task 5: MapView (port of MapContainer)

**Files:**
- Create: `frontend-next/src/components/reports/MapView.tsx`
- Create: `frontend-next/src/components/reports/MarkerPopup.tsx`

A near-verbatim port of `frontend/src/components/MapContainer.tsx`. Three changes:
1. Add `"use client"` at the top.
2. Fix the typing bug at lines 204/222 in the source: change `Map<number, maplibregl.Marker>` to `Map<string | number, maplibregl.Marker>`. Same change in the markersRef declaration.
3. Drop the `i: T, lang: Lang` props — the popup will use `useTranslations` directly.

- [ ] **Step 1: Build a minimal MarkerPopup**

`frontend-next/src/components/reports/MarkerPopup.tsx`:

```tsx
"use client";

import type { Report } from "@/lib/api/mappers";
import { MapPin, Flame, User } from "lucide-react";

interface MarkerPopupProps {
  report: Report;
  locale: string;
}

export function MarkerPopup({ report, locale }: MarkerPopupProps) {
  const severityColor: Record<string, string> = {
    critical: "#FF2D55",
    high: "#FF9F0A",
    medium: "#FFD60A",
    low: "#30D158",
  };
  const color = report.status === "done" ? "#32D74B" : (severityColor[report.severity] ?? "#FF4D94");

  return (
    <div className="rounded-2xl bg-[#0F172A] border border-white/10 overflow-hidden text-text-1 w-[320px]">
      <div className="px-4 py-3 border-b border-white/5" style={{ background: `${color}15` }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color }}>
          <Flame size={12} />
          {report.severity}
          <span className="ml-auto text-text-3">{report.time}</span>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="text-sm text-text-1">{report.description}</div>
        <div className="flex items-center gap-1.5 text-xs text-text-3">
          <MapPin size={12} /> {report.district}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-3">
          <User size={12} /> {report.reporter || "—"}
        </div>
        <a
          href={`/${locale}/reports/${report.id}`}
          className="mt-2 text-xs uppercase tracking-wider text-accent-pink hover:text-pink-light"
        >
          OPEN →
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build MapView**

`frontend-next/src/components/reports/MapView.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot, type Root } from "react-dom/client";
import { MarkerPopup } from "./MarkerPopup";
import type { Report } from "@/lib/api/mappers";

interface MapViewProps {
  reports: Report[];
  selectedId: string | null;
  onSelectReport: (id: string) => void;
  locale: string;
}

const MARKER_COLORS: Record<string, { fill: string; glow: string }> = {
  critical: { fill: "#FF2D55", glow: "rgba(255,45,85,0.7)" },
  high: { fill: "#FF9F0A", glow: "rgba(255,159,10,0.6)" },
  medium: { fill: "#FFD60A", glow: "rgba(255,214,10,0.5)" },
  low: { fill: "#30D158", glow: "rgba(48,209,88,0.5)" },
  done: { fill: "#32D74B", glow: "rgba(50,215,75,0.6)" },
};

function getMarkerStyle(report: Report) {
  if (report.status === "done") return MARKER_COLORS.done;
  return MARKER_COLORS[report.severity] ?? { fill: "#FF4D94", glow: "rgba(255,77,148,0.6)" };
}

function createMarkerElement(color: string, glow: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = "44px";
  el.style.height = "56px";
  el.style.filter = `drop-shadow(0 0 12px ${glow})`;
  el.style.transition = "filter 0.25s ease";
  const safeId = color.replace("#", "");
  el.innerHTML = `
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g-${safeId}" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.75"/>
        </radialGradient>
        <filter id="glow-${safeId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 34 22 34s22-17.5 22-34C44 9.85 34.15 0 22 0z"
        fill="url(#g-${safeId})" filter="url(#glow-${safeId})"/>
      <circle cx="22" cy="20" r="10" fill="white" fill-opacity="0.95"/>
      <circle cx="22" cy="20" r="6" fill="${color}"/>
    </svg>
  `;
  el.addEventListener("mouseenter", () => {
    el.style.filter = `drop-shadow(0 0 22px ${glow})`;
    el.style.zIndex = "10";
  });
  el.addEventListener("mouseleave", () => {
    el.style.filter = `drop-shadow(0 0 12px ${glow})`;
    el.style.zIndex = "auto";
  });
  return el;
}

export default function MapView({ reports, selectedId, onSelectReport, locale }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<{ popup: maplibregl.Popup; root: Root } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const openPopupRef = useRef<(report: Report) => void>(() => {});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [23.3219, 42.6977],
      zoom: 12,
      attributionControl: false,
    });
    map.on("error", (e: { error?: { message?: string } }) => {
      if (e?.error?.message?.includes("projection")) return;
      console.error(e);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    map.on("load", () => setMapLoaded(true));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const openPopup = useCallback((report: Report) => {
    const map = mapRef.current;
    if (!map) return;
    if (popupRef.current) {
      popupRef.current.popup.remove();
      popupRef.current.root.unmount();
      popupRef.current = null;
    }
    const popupNode = document.createElement("div");
    const root = createRoot(popupNode);
    root.render(<MarkerPopup report={report} locale={locale} />);
    const popup = new maplibregl.Popup({
      offset: [0, -58],
      closeButton: true,
      closeOnClick: false,
      maxWidth: "360px",
      className: "chist-popup",
    })
      .setLngLat([report.lng, report.lat])
      .setDOMContent(popupNode)
      .addTo(map);
    popup.on("close", () => {
      root.unmount();
      if (popupRef.current?.popup === popup) popupRef.current = null;
    });
    popupRef.current = { popup, root };
  }, [locale]);

  openPopupRef.current = openPopup;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const currentIds = new Set(reports.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    reports.forEach((report) => {
      const existing = markersRef.current.get(report.id);
      if (existing) {
        existing.setLngLat([report.lng, report.lat]);
        return;
      }
      const style = getMarkerStyle(report);
      const el = createMarkerElement(style.fill, style.glow);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectReport(report.id);
        openPopupRef.current(report);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([report.lng, report.lat])
        .addTo(map);
      markersRef.current.set(report.id, marker);
    });
  }, [reports, onSelectReport, mapLoaded]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const report = reports.find((r) => r.id === selectedId);
    if (!report) return;
    mapRef.current.flyTo({
      center: [report.lng, report.lat],
      zoom: 15,
      duration: 1200,
      essential: true,
    });
    openPopup(report);
  }, [selectedId, reports, openPopup]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
      <style>{`
        .chist-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,77,148,0.2) !important;
          overflow: hidden;
        }
        .chist-popup .maplibregl-popup-tip { border-top-color: #0F172A !important; }
        .chist-popup .maplibregl-popup-close-button {
          color: rgba(255,255,255,0.4) !important;
          font-size: 20px !important;
          right: 10px !important;
          top: 10px !important;
        }
        .chist-popup .maplibregl-popup-close-button:hover { color: #FF4D94 !important; background: transparent !important; }
        .maplibregl-ctrl-attrib { background: rgba(15,23,42,0.7) !important; color: rgba(255,255,255,0.3) !important; font-size: 10px !important; }
        .maplibregl-ctrl-group { background: rgba(15,23,42,0.85) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; overflow: hidden; }
        .maplibregl-ctrl-group button { width: 42px !important; height: 42px !important; }
        .maplibregl-ctrl-group button span { filter: invert(1) !important; }
      `}</style>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend-next/src/components/reports
git commit -m "feat(next): port MapView (MapLibre dark dashboard with severity markers)"
```

---

## Task 6: ReportCard + ReportsClient (sidebar list)

**Files:**
- Create: `frontend-next/src/components/reports/ReportCard.tsx`
- Create: `frontend-next/src/components/reports/ReportsClient.tsx`

- [ ] **Step 1: ReportCard**

`frontend-next/src/components/reports/ReportCard.tsx`:

```tsx
"use client";

import type { Report } from "@/lib/api/mappers";
import { MapPin, Flame } from "lucide-react";

const SEVERITY_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#FF2D55", bg: "rgba(255,45,85,0.12)", label: "КРИТИЧНО" },
  high: { color: "#FF9F0A", bg: "rgba(255,159,10,0.12)", label: "СЕРИОЗНО" },
  medium: { color: "#FFD60A", bg: "rgba(255,214,10,0.12)", label: "СРЕДНО" },
  low: { color: "#30D158", bg: "rgba(48,209,88,0.12)", label: "ЛЕКО" },
};

interface ReportCardProps {
  report: Report;
  selected: boolean;
  onSelect: () => void;
}

export function ReportCard({ report, selected, onSelect }: ReportCardProps) {
  const sev = SEVERITY_BADGE[report.severity] ?? SEVERITY_BADGE.medium;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
        selected
          ? "border-accent-pink-border bg-accent-pink-dim"
          : "border-brand-border bg-bg-card hover:bg-bg-card-hover"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"
          style={{ color: sev.color, background: sev.bg }}
        >
          <Flame size={10} className="inline -mt-0.5" /> {sev.label}
        </span>
        <span className="text-text-3 text-[10px] ml-auto">{report.time}</span>
      </div>
      <div className="text-text-1 text-sm line-clamp-2">{report.description}</div>
      <div className="flex items-center gap-1 mt-1 text-[11px] text-text-3">
        <MapPin size={11} /> {report.district}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: ReportsClient**

`frontend-next/src/components/reports/ReportsClient.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import { ReportCard } from "./ReportCard";
import type { Report } from "@/lib/api/mappers";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => (
  <div className="w-full h-full min-h-[400px] grid place-items-center bg-bg-card text-text-3 text-sm">Loading map…</div>
)});

interface ReportsClientProps {
  initialReports: Report[];
  locale: string;
}

export function ReportsClient({ initialReports, locale }: ReportsClientProps) {
  const { selectedReportId, selectReport, filters } = useApp();

  const filtered = initialReports.filter((r) => {
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-3.5rem)] p-4">
      <aside className="w-full md:w-[360px] flex flex-col gap-2 overflow-y-auto">
        <div className="text-text-3 text-xs uppercase tracking-wider px-1">
          {filtered.length} signals
        </div>
        {filtered.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            selected={selectedReportId === r.id}
            onSelect={() => selectReport(r.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-text-3 text-sm text-center py-8">No reports match the current filters.</div>
        )}
      </aside>
      <div className="flex-1 rounded-2xl overflow-hidden border border-brand-border bg-bg-card">
        <MapView
          reports={filtered}
          selectedId={selectedReportId}
          onSelectReport={selectReport}
          locale={locale}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/components/reports/ReportCard.tsx frontend-next/src/components/reports/ReportsClient.tsx
git commit -m "feat(next): ReportCard + ReportsClient (sidebar list + dynamic MapView)"
```

---

## Task 7: Reports page composition

**Files:**
- Modify: `frontend-next/src/app/[locale]/(app)/reports/page.tsx`

Replace the Phase 3 placeholder with the real composition: server fetch → map → pass to `ReportsClient`.

- [ ] **Step 1: Rewrite the page**

`frontend-next/src/app/[locale]/(app)/reports/page.tsx`:

```tsx
import { reportsApi, isUnauthorized } from "@/lib/api";
import { mapApiReport, type Report } from "@/lib/api/mappers";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { redirect } from "next/navigation";

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  let reports: Report[] = [];
  try {
    const raw = (await reportsApi.list()) as Record<string, unknown>[];
    reports = (raw ?? []).map(mapApiReport);
  } catch (err) {
    if (isUnauthorized(err)) {
      redirect(`/${locale}/login`);
    }
    // For other errors, show an empty list — better than crashing the page.
  }

  return <ReportsClient initialReports={reports} locale={locale} />;
}
```

- [ ] **Step 2: Smoke test**

Start dev. As the mock user, visit `/bg/reports`. Expected:
- Navbar at the top
- 7 cards in the left sidebar (Препълнен, Изоставена, Счупени, Графити, Чували, Разляно, Изхвърлен matrak)
- MapLibre dark map fills the right side, centered on Sofia
- 7 pink-to-green markers scattered across Sofia
- Click a marker → popup opens with description; sidebar card highlights
- Click a sidebar card → map flies to that marker, popup opens

If any of these fail, STOP and diagnose before committing.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/app/\[locale\]/\(app\)/reports/page.tsx
git commit -m "feat(next): reports page composes server fetch + ReportsClient + MapView"
```

---

## Task 8: Report detail page

**Files:**
- Create: `frontend-next/src/app/[locale]/(app)/reports/[id]/page.tsx`

Server page that fetches one report by id, renders detail + claim/complete buttons (mutations wired to existing actions).

- [ ] **Step 1: Build the page**

`frontend-next/src/app/[locale]/(app)/reports/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { reportsApi, isUnauthorized, ApiError } from "@/lib/api";
import { mapApiReport, type Report } from "@/lib/api/mappers";
import { claimReport, completeReport, confirmReport } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Flame, User } from "lucide-react";

export default async function ReportDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  let report: Report | null = null;
  try {
    const raw = (await reportsApi.getById(id)) as Record<string, unknown>;
    report = mapApiReport(raw);
  } catch (err) {
    if (isUnauthorized(err)) redirect(`/${locale}/login`);
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  if (!report) notFound();

  const claimAction = claimReport.bind(null, report.id);
  const completeAction = completeReport.bind(null, report.id);
  const confirmAction = confirmReport.bind(null, report.id);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <Link href={`/${locale}/reports`} className="text-text-3 text-xs uppercase tracking-wider hover:text-text-1 flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> back to reports
      </Link>

      <div className="rounded-2xl border border-brand-border bg-bg-card p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-accent-pink uppercase tracking-widest text-xs">
            <Flame size={12} className="inline -mt-0.5" /> {report.severity}
          </span>
          <span className="text-text-3 text-xs">{report.time}</span>
          <span className="ml-auto text-text-2 text-xs uppercase tracking-wider">{report.status}</span>
        </div>
        <h1 className="text-text-1 text-2xl">{report.description}</h1>
        <div className="flex items-center gap-1.5 text-text-3 text-sm">
          <MapPin size={14} /> {report.district} · {report.location}
        </div>
        <div className="flex items-center gap-1.5 text-text-3 text-sm">
          <User size={14} /> {report.reporter || "—"}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {report.status === "open" && (
            <form action={claimAction}>
              <Button type="submit">Claim</Button>
            </form>
          )}
          {report.status === "in-progress" && (
            <form action={completeAction.bind(null, new FormData())}>
              <Button type="submit">Mark complete</Button>
            </form>
          )}
          <form action={confirmAction}>
            <Button type="submit" variant="outline">Confirm sighting</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
```

Note on `completeReport`: it expects `(id, formData)`. The form `action` here passes `new FormData()` (empty) for now — Phase 5/later can add a completion-photo upload to it. Mock mode no-ops mutations so this works fine for the walkthrough.

- [ ] **Step 2: Smoke test**

Visit `/bg/reports/r-101` (or click a sidebar card). Expected: detail page renders description + meta; Claim button visible (status was "OPEN" → mapped to "open").

Click Claim → page revalidates. In mock mode the server action no-ops, page re-renders with same data. In real mode the backend updates status.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/app/\[locale\]/\(app\)/reports/\[id\]
git commit -m "feat(next): report detail page with claim/complete/confirm actions"
```

---

## Task 9: New report page

**Files:**
- Create: `frontend-next/src/app/[locale]/(app)/reports/new/page.tsx`
- Create: `frontend-next/src/components/reports/NewReportForm.tsx`
- Add shadcn primitive: `textarea`

- [ ] **Step 1: Install textarea**

```bash
cd frontend-next && npx shadcn@latest add textarea
```

- [ ] **Step 2: Build the form**

`frontend-next/src/components/reports/NewReportForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createReport } from "@/lib/actions/reports";

export function NewReportForm() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createReport(fd);
      router.push(`/${locale}/reports`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" className="text-text-2 text-xs uppercase tracking-wider">Description</Label>
        <Textarea id="description" name="description" required rows={4} placeholder="What did you see?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="latitude" className="text-text-2 text-xs uppercase tracking-wider">Latitude</Label>
          <Input id="latitude" name="latitude" type="number" step="any" required defaultValue="42.6977" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="longitude" className="text-text-2 text-xs uppercase tracking-wider">Longitude</Label>
          <Input id="longitude" name="longitude" type="number" step="any" required defaultValue="23.3219" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="severity" className="text-text-2 text-xs uppercase tracking-wider">Severity</Label>
        <select id="severity" name="severity" className="h-9 rounded-md border border-brand-border bg-bg-input text-text-1 px-3 text-sm" defaultValue="medium">
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo" className="text-text-2 text-xs uppercase tracking-wider">Photo (optional)</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" />
      </div>

      {error && <p className="text-status-red text-sm">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? "Submitting..." : "Submit report"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Build the page**

`frontend-next/src/app/[locale]/(app)/reports/new/page.tsx`:

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewReportForm } from "@/components/reports/NewReportForm";

export default async function NewReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main className="max-w-xl mx-auto px-4 py-8 flex flex-col gap-6">
      <Link href={`/${locale}/reports`} className="text-text-3 text-xs uppercase tracking-wider hover:text-text-1 flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> back
      </Link>
      <div className="rounded-2xl border border-brand-border bg-bg-card p-6">
        <h1 className="text-text-1 text-xl tracking-widest mb-4" style={{ fontFamily: "var(--font-display)" }}>
          NEW SIGNAL
        </h1>
        <NewReportForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Smoke test**

Click NEW REPORT in the navbar. Expected: form renders. Fill description, accept defaults, submit. In mock mode the server action no-ops + you redirect back to `/bg/reports`. (No new card appears because mock data is static — that's expected; the form path works.)

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/app/\[locale\]/\(app\)/reports/new frontend-next/src/components/reports/NewReportForm.tsx frontend-next/src/components/ui/textarea.tsx frontend-next/components.json frontend-next/package.json frontend-next/package-lock.json
git commit -m "feat(next): new report page with form + createReport server action"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Tests + build**

```bash
cd frontend-next
npm test          # expect: 48 passing (Phase 3 had 41, this phase adds 7 mapper tests)
npm run build     # expect: green, with /[locale]/reports/[id] and /[locale]/reports/new routes
```

- [ ] **Step 2: Manual mock walkthrough**

In a browser, log in as `test@chist.bg / test1234`. Verify:

| Step | Expected |
|---|---|
| `/bg/reports` | Navbar + sidebar with 7 cards + dark MapLibre map + 7 markers |
| Click a sidebar card | Map flies to marker, popup opens with description |
| Click a marker | Card in sidebar highlights, popup opens |
| Popup "OPEN →" link | Navigates to `/bg/reports/r-XXX` detail page |
| Detail page | Description, district, severity, Claim/Confirm buttons |
| Click Claim | Page revalidates, no error |
| Back to `/bg/reports` → click NEW REPORT in navbar | Form page loads |
| Fill description, submit | Redirects back to `/bg/reports`; no error |
| Click LOG OUT | Back to `/bg/login`, cookie cleared |

- [ ] **Step 3: Tag**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git tag -a nextjs-phase-4-complete -m "Phase 4 (reports) complete: Navbar, sidebar list, MapLibre dashboard, detail + new pages, claim/complete/confirm actions all wired with mock data."
```

---

## Phase 4 Definition of Done

- 48 vitest tests pass.
- Production build green.
- Full mock walkthrough above succeeds end-to-end.
- Old `frontend/` untouched.

## What's NOT in Phase 4

- **Phase 5:** Leaderboard, Profile, Rewards pages.
- **Phase 6:** Locale switcher in Navbar, i18n migration of all the inline strings ("Loading map…", "Claim", "Submit report", severity labels) into next-intl catalogs.
- **Phase 7:** Helm + cutover.
- Photo upload IS in the new-report form but the completion-photo upload is *not* — `completeReport` is called with an empty FormData. That can be added when status flows are exercised against a real backend.
- Notifications toasts are NOT wired up yet (the `AppContext.pushNotification` is plumbed but unused). Phase 5 can add a `Toaster` from `sonner`.
