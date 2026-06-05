# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the `frontend-next` app — login/register, navbar, reports sidebar, new-report map, marker popup, leaderboard, and profile — using the existing token system, then open a PR to `dev`.

**Architecture:** Pure presentational/layout changes on the `nextjs-rewrite` branch. No API, mapper, server-action, or auth-flow changes. New labels are added to both `messages/bg.json` and `messages/en.json`. One new pure helper module (`lib/geo.ts`) and one new client component (`components/reports/LocationPicker.tsx`).

**Tech Stack:** Next.js 16 (App Router), Tailwind v4, base-ui/shadcn, next-intl (bg/en), maplibre-gl, lucide-react, vitest + testing-library.

**Working directory for all commands:** `/home/perro/proj/protri/GrupaLom-Project3-Chist/frontend-next`

**Testing note:** These are mostly presentational components with little testable logic, and there are no existing component tests (only route/mapper tests). So the per-task verification gate is `npm run lint` + `npx tsc --noEmit` + `npm run build`, plus a real unit test for the one piece with actual logic (the geo helper in Task 4). Don't fabricate low-value snapshot tests for pure layout.

**No emojis anywhere — icons are lucide-react only.** (Task 6 also removes a pre-existing `★` glyph.)

---

### Task 1: Login / Register — gradient background + two-pane card

**Files:**
- Modify: `frontend-next/src/app/globals.css` (add auth gradient utilities)
- Modify: `frontend-next/src/app/[locale]/(auth)/layout.tsx`
- Modify: `frontend-next/src/components/auth/LoginCard.tsx`
- Modify: `frontend-next/messages/en.json` + `frontend-next/messages/bg.json` (add `Auth.brandTagline`, `Auth.brandBullets`)

- [ ] **Step 1: Add auth gradient utilities to `globals.css`**

Append to the end of `frontend-next/src/app/globals.css`:

```css
/* ── Auth gradient backdrop ───────────────────────────────────────────────
   Dark base + soft pink→magenta radial glows, layered behind the auth card. */
.auth-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(60% 50% at 18% 12%, rgba(255, 77, 148, 0.16) 0%, transparent 60%),
    radial-gradient(55% 55% at 85% 88%, rgba(192, 38, 211, 0.16) 0%, transparent 62%),
    radial-gradient(40% 40% at 75% 18%, rgba(244, 114, 182, 0.08) 0%, transparent 60%),
    var(--color-bg-base);
}
.auth-glow {
  position: absolute;
  border-radius: 9999px;
  filter: blur(40px);
  pointer-events: none;
}
```

- [ ] **Step 2: Rewrite the auth layout** `frontend-next/src/app/[locale]/(auth)/layout.tsx`

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="auth-backdrop" aria-hidden="true" />
      <div className="relative z-[1] w-full max-w-4xl">{children}</div>
    </main>
  );
}
```

- [ ] **Step 3: Add brand-pane copy to message files**

In `frontend-next/messages/en.json`, inside the `"Auth"` object add:

```json
    "brandTagline": "Spot it. Report it. Clean it.",
    "brandBullets": {
      "report": "Report litter and dumping across Sofia in seconds",
      "earn": "Earn points, badges and streaks for every cleanup",
      "compete": "Climb the city leaderboard with your district"
    }
```

In `frontend-next/messages/bg.json`, inside the `"Auth"` object add:

```json
    "brandTagline": "Забележи. Сигнализирай. Почисти.",
    "brandBullets": {
      "report": "Сигнализирай за боклук и нерегламентирани сметища в София за секунди",
      "earn": "Печели точки, значки и серии за всяко почистване",
      "compete": "Изкачи се в градската класация заедно с твоя район"
    }
```

- [ ] **Step 4: Rewrite `LoginCard.tsx` as a two-pane panel**

Replace the entire return statement's outer wrapper (keep all hooks/handlers above it unchanged). The full component file becomes:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Leaf, MapPin, Award, Trophy } from "lucide-react";

type Mode = "login" | "register";

export function LoginCard() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirm, setConfirm] = useState("");

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError(t("errorRequired"));
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? t("errorGeneric"));
        return;
      }
      router.push(`/${locale}/reports`);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !email || !password) return setError(t("errorRequired"));
    if (password !== confirm) return setError(t("errorMismatch"));
    if (password.length < 8) return setError(t("errorMinLength"));
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? t("errorGeneric"));
        return;
      }
      router.push(`/${locale}/reports`);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const bullets = [
    { icon: MapPin, text: t("brandBullets.report") },
    { icon: Award, text: t("brandBullets.earn") },
    { icon: Trophy, text: t("brandBullets.compete") },
  ];

  return (
    <div className="anim-pop-in grid md:grid-cols-2 rounded-3xl border border-brand-border bg-bg-card backdrop-blur shadow-2xl overflow-hidden">
      {/* Brand pane — desktop only */}
      <div className="relative hidden md:flex flex-col justify-between p-10 border-r border-brand-border overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 25% 20%, var(--color-accent-pink-glow), transparent 60%)" }}
        />
        <div className="relative flex items-center gap-3">
          <span className="rounded-full bg-accent-pink-dim border border-accent-pink-border p-2.5 text-accent-pink">
            <Leaf size={26} strokeWidth={1.8} />
          </span>
          <div className="flex flex-col leading-none">
            <span className="display-heading text-text-1 text-2xl">CHIST</span>
            <span className="text-text-3 text-[10px] uppercase tracking-[0.3em] mt-1">Sofia · Cleaner City</span>
          </div>
        </div>

        <div className="relative">
          <h2 className="display-heading text-text-1 text-3xl leading-tight mb-6">{t("brandTagline")}</h2>
          <ul className="flex flex-col gap-4">
            {bullets.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-text-2 text-sm">
                <span className="mt-0.5 text-accent-pink shrink-0"><Icon size={18} strokeWidth={1.8} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-text-3 text-[10px] uppercase tracking-[0.3em]">Sofia · Beta</div>
      </div>

      {/* Form pane */}
      <div className="p-8 md:p-12 flex flex-col justify-center">
        <div className="flex md:hidden flex-col items-center gap-2 mb-8">
          <div className="rounded-full bg-accent-pink-dim border border-accent-pink-border p-3 text-accent-pink">
            <Leaf size={28} strokeWidth={1.8} />
          </div>
          <div className="display-heading text-text-1 text-3xl">CHIST</div>
          <div className="text-text-3 text-[10px] uppercase tracking-[0.3em]">Sofia · Cleaner City</div>
        </div>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">{t("tabs.login")}</TabsTrigger>
            <TabsTrigger value="register">{t("tabs.register")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={submitLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email" className="text-text-2 text-xs uppercase tracking-wider">{t("email")}</Label>
                <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")} autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-password" className="text-text-2 text-xs uppercase tracking-wider">{t("password")}</Label>
                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")} autoComplete="current-password" required />
              </div>
              {error && <div className="text-status-red text-sm">{error}</div>}
              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? t("submitting") : t("submitLogin")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={submitRegister} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-username" className="text-text-2 text-xs uppercase tracking-wider">{t("username")}</Label>
                <Input id="reg-username" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("usernamePlaceholder")} autoComplete="username" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-email" className="text-text-2 text-xs uppercase tracking-wider">{t("email")}</Label>
                <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")} autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-password" className="text-text-2 text-xs uppercase tracking-wider">{t("password")}</Label>
                <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("minPasswordHint")} autoComplete="new-password" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-confirm" className="text-text-2 text-xs uppercase tracking-wider">{t("confirmPassword")}</Label>
                <Input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("passwordPlaceholder")} autoComplete="new-password" required />
              </div>
              {error && <div className="text-status-red text-sm">{error}</div>}
              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? t("submitting") : t("submitRegister")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify lint + types + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all pass, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css "src/app/[locale]/(auth)/layout.tsx" src/components/auth/LoginCard.tsx messages/en.json messages/bg.json
git commit -m "feat(auth): gradient backdrop + two-pane login/register card"
```

---

### Task 2: Navbar — full-width, spread out

**Files:**
- Modify: `frontend-next/src/components/nav/Navbar.tsx`

- [ ] **Step 1: Widen the nav container and spread links**

In `frontend-next/src/components/nav/Navbar.tsx`, replace the `<nav>` opening tag and the links `<ul>`. Change the nav line:

```tsx
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
```

to:

```tsx
      <nav className="flex h-16 items-center justify-between gap-6 px-6 lg:px-10">
```

Then replace the links list:

```tsx
        <ul className="hidden md:flex items-center gap-1">
```

with a centered, spread-out list:

```tsx
        <ul className="hidden md:flex flex-1 items-center justify-center gap-2 lg:gap-4">
```

And widen each link's hit area — change the link `className` template inside the `links.map` to:

```tsx
                  className={`px-4 py-2 rounded-md text-xs uppercase tracking-wider transition ${
                    active
                      ? "text-accent-pink bg-accent-pink-dim"
                      : "text-text-2 hover:text-text-1 hover:bg-brand-primary-dim"
                  }`}
```

(Logo block and the right-hand actions block stay as-is.)

- [ ] **Step 2: Verify lint + types + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/Navbar.tsx
git commit -m "feat(nav): full-width navbar with spread-out links"
```

---

### Task 3: Reports sidebar — streak header

**Files:**
- Modify: `frontend-next/src/app/[locale]/(app)/reports/page.tsx` (fetch current user)
- Modify: `frontend-next/src/components/reports/ReportsClient.tsx` (accept `user`, render header)
- Modify: `frontend-next/messages/en.json` + `frontend-next/messages/bg.json` (add `Reports.streakDays`, `Reports.streakLabel`)

- [ ] **Step 1: Add streak labels to message files**

In `frontend-next/messages/en.json` `"Reports"` object add:

```json
    "streakDays": "{n}-day streak",
    "streakLabel": "Streak",
    "signalsLabel": "Signals"
```

In `frontend-next/messages/bg.json` `"Reports"` object add:

```json
    "streakDays": "{n}-дневна серия",
    "streakLabel": "Серия",
    "signalsLabel": "Сигнали"
```

- [ ] **Step 2: Fetch the current user in the reports page**

Replace `frontend-next/src/app/[locale]/(app)/reports/page.tsx` with:

```tsx
import { reportsApi, usersApi, isUnauthorized } from "@/lib/api";
import { mapApiReport, mapApiUser, type Report, type User } from "@/lib/api/mappers";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { redirect } from "next/navigation";

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  let reports: Report[] = [];
  let user: User | null = null;
  try {
    const [rawReports, rawUser] = await Promise.all([
      reportsApi.list() as Promise<Record<string, unknown>[]>,
      usersApi.getMe().catch(() => null) as Promise<Record<string, unknown> | null>,
    ]);
    reports = (rawReports ?? []).map(mapApiReport);
    user = rawUser ? mapApiUser(rawUser) : null;
  } catch (err) {
    if (isUnauthorized(err)) {
      redirect(`/${locale}/login`);
    }
    // For other errors, show an empty list — better than crashing the page.
  }

  return <ReportsClient initialReports={reports} user={user} locale={locale} />;
}
```

- [ ] **Step 3: Render the streak header in `ReportsClient.tsx`**

Replace `frontend-next/src/components/reports/ReportsClient.tsx` with:

```tsx
"use client";

import dynamic from "next/dynamic";
import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import { useApp } from "@/context/AppContext";
import { ReportCard } from "./ReportCard";
import type { Report, User } from "@/lib/api/mappers";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] grid place-items-center bg-bg-card text-text-3 text-sm">
      Loading map…
    </div>
  ),
});

interface ReportsClientProps {
  initialReports: Report[];
  user: User | null;
  locale: string;
}

export function ReportsClient({ initialReports, user, locale }: ReportsClientProps) {
  const t = useTranslations("Reports");
  const { selectedReportId, selectReport, filters } = useApp();

  const filtered = initialReports.filter((r) => {
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-4rem)] p-4">
      <aside className="w-full md:w-[360px] flex flex-col gap-3 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-brand-border bg-bg-card px-3 py-2.5">
            <div className="text-text-1 text-xl leading-none">{filtered.length}</div>
            <div className="text-text-3 text-[10px] uppercase tracking-wider mt-1">{t("signalsLabel")}</div>
          </div>
          <div className="rounded-xl border border-accent-pink-border bg-accent-pink-dim px-3 py-2.5 flex items-center gap-2">
            <span className="text-accent-pink"><Flame size={18} strokeWidth={2} /></span>
            <div>
              <div className="text-text-1 text-xl leading-none">{user?.streak ?? 0}</div>
              <div className="text-text-3 text-[10px] uppercase tracking-wider mt-1">{t("streakLabel")}</div>
            </div>
          </div>
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
          <div className="text-text-3 text-sm text-center py-8">
            {t("noMatch")}
          </div>
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

Note: the height changed from `3.5rem` to `4rem` to match the navbar's new `h-16` from Task 2.

- [ ] **Step 4: Verify lint + types + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(app)/reports/page.tsx" src/components/reports/ReportsClient.tsx messages/en.json messages/bg.json
git commit -m "feat(reports): streak + signals header on the sidebar"
```

---

### Task 4: New-report — interactive pin-drop map

**Files:**
- Create: `frontend-next/src/lib/geo.ts` (pure helpers — Sofia center, clamp, format)
- Create: `frontend-next/src/lib/geo.test.ts`
- Create: `frontend-next/src/components/reports/LocationPicker.tsx`
- Modify: `frontend-next/src/components/reports/NewReportForm.tsx`
- Modify: `frontend-next/messages/en.json` + `frontend-next/messages/bg.json` (add `NewReport.pickLocation`, `useMyLocation`, `locating`, `locationError`)

- [ ] **Step 1: Write the failing test for the geo helper**

Create `frontend-next/src/lib/geo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SOFIA_CENTER, clampLat, clampLng, formatCoords } from "./geo";

describe("geo helpers", () => {
  it("exposes Sofia center as [lng, lat]", () => {
    expect(SOFIA_CENTER).toEqual([23.3219, 42.6977]);
  });

  it("clamps latitude to [-90, 90]", () => {
    expect(clampLat(120)).toBe(90);
    expect(clampLat(-120)).toBe(-90);
    expect(clampLat(42.7)).toBe(42.7);
  });

  it("clamps longitude to [-180, 180]", () => {
    expect(clampLng(200)).toBe(180);
    expect(clampLng(-200)).toBe(-180);
    expect(clampLng(23.3)).toBe(23.3);
  });

  it("formats coordinates to 5 decimal places with N/E suffix", () => {
    expect(formatCoords(42.69771, 23.32194)).toBe("42.69771°N, 23.32194°E");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/geo.test.ts`
Expected: FAIL — cannot find module `./geo`.

- [ ] **Step 3: Implement `frontend-next/src/lib/geo.ts`**

```ts
/** [lng, lat] — the order maplibre-gl expects. Sofia city center. */
export const SOFIA_CENTER: [number, number] = [23.3219, 42.6977];

export function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

export function clampLng(lng: number): number {
  return Math.max(-180, Math.min(180, lng));
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/geo.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add new-report labels to message files**

In `frontend-next/messages/en.json` `"NewReport"` object add:

```json
    "pickLocation": "Location",
    "pickLocationHint": "Click the map to drop a pin",
    "useMyLocation": "Use my location",
    "locating": "Locating…",
    "locationError": "Could not get your location"
```

In `frontend-next/messages/bg.json` `"NewReport"` object add:

```json
    "pickLocation": "Локация",
    "pickLocationHint": "Кликнете върху картата, за да поставите карфица",
    "useMyLocation": "Използвай моята локация",
    "locating": "Локализиране…",
    "locationError": "Локацията не може да бъде определена"
```

- [ ] **Step 6: Create `LocationPicker.tsx`**

Create `frontend-next/src/components/reports/LocationPicker.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SOFIA_CENTER, clampLat, clampLng } from "@/lib/geo";

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

function createPinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cursor = "grab";
  el.style.width = "44px";
  el.style.height = "56px";
  el.style.filter = "drop-shadow(0 0 12px rgba(255,77,148,0.6))";
  el.innerHTML = `
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 34 22 34s22-17.5 22-34C44 9.85 34.15 0 22 0z"
        fill="#FF4D94" fill-opacity="0.92"/>
      <circle cx="22" cy="20" r="10" fill="white" fill-opacity="0.95"/>
      <circle cx="22" cy="20" r="6" fill="#FF4D94"/>
    </svg>
  `;
  return el;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // Keep the latest onChange without re-running the init effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: [number, number] =
      lat && lng ? [lng, lat] : SOFIA_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: start,
      zoom: 12,
      attributionControl: false,
    });
    map.on("error", (e: { error?: { message?: string } }) => {
      if (e?.error?.message?.includes("projection")) return;
      console.error(e);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const marker = new maplibregl.Marker({ element: createPinElement(), anchor: "bottom", draggable: true })
      .setLngLat(start)
      .addTo(map);
    marker.on("dragend", () => {
      const { lat: mLat, lng: mLng } = marker.getLngLat();
      onChangeRef.current(clampLat(mLat), clampLng(mLng));
    });

    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current(clampLat(e.lngLat.lat), clampLng(e.lngLat.lng));
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Intentionally run once — props are synced via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external coordinate changes (e.g. "use my location") onto the map.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !lat || !lng) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 800, essential: true });
  }, [lat, lng]);

  return (
    <div ref={containerRef} className="w-full h-[320px] rounded-xl overflow-hidden border border-brand-border" />
  );
}
```

- [ ] **Step 7: Rewrite `NewReportForm.tsx` to use the picker**

Replace `frontend-next/src/components/reports/NewReportForm.tsx` with:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createReport } from "@/lib/actions/reports";
import { SOFIA_CENTER, clampLat, clampLng, formatCoords } from "@/lib/geo";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-xl border border-brand-border bg-bg-card grid place-items-center text-text-3 text-sm">
      Loading map…
    </div>
  ),
});

export function NewReportForm() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const t = useTranslations("NewReport");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // [lng, lat] = SOFIA_CENTER → default to Sofia center.
  const [lat, setLat] = useState(SOFIA_CENTER[1]);
  const [lng, setLng] = useState(SOFIA_CENTER[0]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError(t("locationError"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(clampLat(pos.coords.latitude));
        setLng(clampLng(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setError(t("locationError"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createReport(fd);
      router.push(`/${locale}/reports`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failure"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" className="text-text-2 text-xs uppercase tracking-wider">{t("description")}</Label>
        <Textarea id="description" name="description" required rows={4} placeholder={t("descriptionPlaceholder")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-text-2 text-xs uppercase tracking-wider">{t("pickLocation")}</Label>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-xs text-accent-pink hover:text-pink-light disabled:opacity-50 transition"
          >
            <LocateFixed size={14} />
            {locating ? t("locating") : t("useMyLocation")}
          </button>
        </div>
        <LocationPicker lat={lat} lng={lng} onChange={(nLat, nLng) => { setLat(nLat); setLng(nLng); }} />
        <div className="text-text-3 text-xs flex items-center justify-between">
          <span>{t("pickLocationHint")}</span>
          <span className="text-text-2">{formatCoords(lat, lng)}</span>
        </div>
        <input type="hidden" name="latitude" value={lat} readOnly />
        <input type="hidden" name="longitude" value={lng} readOnly />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="severity" className="text-text-2 text-xs uppercase tracking-wider">{t("severity")}</Label>
        <select id="severity" name="severity" className="h-9 rounded-md border border-brand-border bg-bg-input text-text-1 px-3 text-sm" defaultValue="medium">
          <option value="critical">{t("severityCritical")}</option>
          <option value="high">{t("severityHigh")}</option>
          <option value="medium">{t("severityMedium")}</option>
          <option value="low">{t("severityLow")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo" className="text-text-2 text-xs uppercase tracking-wider">{t("photo")}</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" />
      </div>

      {error && <p className="text-status-red text-sm">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
```

Note: the new-report page card is `max-w-xl` — widen it so the map breathes. In `frontend-next/src/app/[locale]/(app)/reports/new/page.tsx`, change `max-w-xl` to `max-w-2xl` on the `<main>` element.

- [ ] **Step 8: Verify tests + lint + types + build**

Run: `npm test -- src/lib/geo.test.ts && npm run lint && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts src/components/reports/LocationPicker.tsx src/components/reports/NewReportForm.tsx "src/app/[locale]/(app)/reports/new/page.tsx" messages/en.json messages/bg.json
git commit -m "feat(reports): pin-drop location picker on new-report page"
```

---

### Task 5: Marker popup — match site styling

**Files:**
- Modify: `frontend-next/src/components/reports/MarkerPopup.tsx`
- Modify: `frontend-next/src/components/reports/MapView.tsx` (the `.chist-popup` `<style>` block)

- [ ] **Step 1: Restyle `MarkerPopup.tsx`**

Replace `frontend-next/src/components/reports/MarkerPopup.tsx` with:

```tsx
"use client";

import type { Report } from "@/lib/api/mappers";
import { MapPin, Flame, User, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface MarkerPopupProps {
  report: Report;
  locale: string;
}

export function MarkerPopup({ report, locale }: MarkerPopupProps) {
  const tSev = useTranslations("Severity");
  const tRD = useTranslations("ReportDetail");
  const severityColor: Record<string, string> = {
    critical: "#FF2D55",
    high: "#FF9F0A",
    medium: "#FFD60A",
    low: "#30D158",
  };
  const color = report.status === "done" ? "#32D74B" : (severityColor[report.severity] ?? "#FF4D94");

  return (
    <div className="rounded-2xl bg-bg-surface border border-brand-border overflow-hidden text-text-1 w-[320px]">
      <div className="px-4 py-3 border-b border-brand-border" style={{ background: `${color}1f` }}>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest" style={{ color }}>
          <Flame size={12} />
          {tSev(report.severity as "critical" | "high" | "medium" | "low")}
          <span className="ml-auto text-text-3 normal-case tracking-normal">{report.time}</span>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="text-sm text-text-1">{report.description}</div>
        <div className="flex items-center gap-1.5 text-xs text-text-2">
          <MapPin size={12} className="text-text-3" /> {report.district}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-2">
          <User size={12} className="text-text-3" /> {report.reporter || tRD("unknownReporter")}
        </div>
        <a
          href={`/${locale}/reports/${report.id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-accent-pink hover:text-pink-light transition"
        >
          {tRD("openLink")} <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Align the popup chrome CSS in `MapView.tsx`**

In `frontend-next/src/components/reports/MapView.tsx`, in the `<style>` block, change the popup-content shadow/glow and the tip color so they read on the new surface. Replace:

```css
        .chist-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,77,148,0.2) !important;
          overflow: hidden;
        }
        .chist-popup .maplibregl-popup-tip { border-top-color: #0F172A !important; }
```

with:

```css
        .chist-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 36px rgba(255,77,148,0.18) !important;
          overflow: hidden;
        }
        .chist-popup .maplibregl-popup-tip { border-top-color: var(--color-bg-surface) !important; }
```

- [ ] **Step 3: Verify lint + types + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/reports/MarkerPopup.tsx src/components/reports/MapView.tsx
git commit -m "feat(reports): restyle map marker popup to match site tokens"
```

---

### Task 6: Leaderboard — wide multi-column desktop layout

**Files:**
- Modify: `frontend-next/src/components/leaderboard/LeaderboardClient.tsx`
- Modify: `frontend-next/src/components/leaderboard/LeaderRow.tsx` (replace `★` glyph with lucide `Star`)

- [ ] **Step 1: Replace the `★` glyph in `LeaderRow.tsx` with a lucide icon**

In `frontend-next/src/components/leaderboard/LeaderRow.tsx`, update the import line:

```tsx
import { Check, Flame, Paintbrush, Trophy } from "lucide-react";
```

to:

```tsx
import { Check, Flame, Paintbrush, Trophy, Star } from "lucide-react";
```

Then replace the badge-glyph block:

```tsx
            {user.earnedBadges.slice(0, 3).map((b) => (
              <span key={b.id} title={tBadges(`${b.id}.name` as `${string}.name`)}>★</span>
            ))}
```

with:

```tsx
            {user.earnedBadges.slice(0, 3).map((b) => (
              <span key={b.id} title={tBadges(`${b.id}.name` as `${string}.name`)} className="text-accent-pink">
                <Star size={11} strokeWidth={2} className="inline fill-current" />
              </span>
            ))}
```

- [ ] **Step 2: Widen + two-column the leaderboard**

Replace the `return` block of `frontend-next/src/components/leaderboard/LeaderboardClient.tsx` (everything from `return (` to the closing `);`) with:

```tsx
  return (
    <main className="anim-fade-up max-w-6xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
      <h1 className="display-heading text-text-1 text-2xl">
        {t("title")}
      </h1>

      <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-6 items-start">
        {/* Left: podium + your position */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-brand-border bg-bg-card p-4">
            <Podium top3={top3} />
          </div>
          {myEntry && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-accent-pink-border bg-accent-pink-dim text-sm">
              <span className="text-text-2 text-xs uppercase tracking-wider">{t("yourPosition")}</span>
              <span className="text-text-1">
                #{myEntry.rank} ·{" "}
                {sortBy === "awards" ? myEntry.awards :
                 sortBy === "cleanings" ? myEntry.cleanings :
                 myEntry.points.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Right: tabs + ranked list */}
        <div className="flex flex-col gap-4">
          <div className="flex bg-bg-card rounded-md p-1 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSortBy(tab.id)}
                className={`flex-1 py-2 rounded text-xs uppercase tracking-wider transition ${
                  sortBy === tab.id ? "bg-accent-pink text-bg-base" : "text-text-2 hover:text-text-1"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {sorted.map((u, idx) => (
              <LeaderRow key={u.id} user={u} isMe={u.id === me.id} index={idx} sortBy={sortBy} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
```

- [ ] **Step 3: Verify lint + types + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/leaderboard/LeaderboardClient.tsx src/components/leaderboard/LeaderRow.tsx
git commit -m "feat(leaderboard): wide two-column desktop layout"
```

---

### Task 7: Profile — wide dashboard layout

**Files:**
- Modify: `frontend-next/src/components/profile/ProfileClient.tsx`

- [ ] **Step 1: Widen + two-column the profile**

Replace the `return` block of `frontend-next/src/components/profile/ProfileClient.tsx` (everything from `return (` to the closing `);`) with:

```tsx
  return (
    <main className="anim-fade-up max-w-6xl mx-auto px-4 lg:px-8 py-8 grid lg:grid-cols-[minmax(0,380px)_1fr] gap-6 items-start">
      {/* Left: identity panel */}
      <div className="flex flex-col gap-5 lg:sticky lg:top-20">
        <ProfileHero user={user} />
        <XpBar user={user} />
        <StatCards user={user} />
      </div>

      {/* Right: tabbed content */}
      <div className="flex flex-col gap-5">
        <div className="flex bg-bg-card rounded-md p-1 gap-1">
          {TABS.map((tt) => (
            <button
              key={tt.id}
              onClick={() => setTab(tt.id)}
              className={`flex-1 py-2 rounded text-xs uppercase tracking-wider transition ${
                tab === tt.id ? "bg-accent-pink text-bg-base" : "text-text-2 hover:text-text-1"
              }`}
            >
              {tt.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-brand-border bg-bg-card p-5 min-h-[300px]">
          {tab === "stats"    && <StatBars user={user} />}
          {tab === "badges"   && <BadgeGrid user={user} />}
          {tab === "activity" && <ActivityChart />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
    </main>
  );
```

- [ ] **Step 2: Verify lint + types + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/ProfileClient.tsx
git commit -m "feat(profile): wide dashboard layout for desktop"
```

---

### Task 8: Full verification + PR to dev

**Files:** none (verification + git)

- [ ] **Step 1: Full clean verification**

Run: `npm run lint && npx tsc --noEmit && npm test && npm run build`
Expected: lint clean, no type errors, all vitest tests pass, build succeeds.

- [ ] **Step 2: Grep for accidental emojis in changed files**

Run:
```bash
git diff --name-only dev...HEAD -- frontend-next | grep -E '\.(tsx?|css|json)$' | xargs grep -nP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{2190}-\x{21FF}\x{2700}-\x{27BF}]' || echo "no emoji glyphs found"
```
Expected: "no emoji glyphs found" (the `★` was replaced in Task 6; arrow/symbol glyphs like `→` in pre-existing Auth switch strings are message-file content, not introduced here — leave them).

- [ ] **Step 3: Push the branch and open the PR to `dev`**

```bash
git push -u origin nextjs-rewrite
gh pr create --base dev --head nextjs-rewrite \
  --title "Frontend redesign: auth, nav, sidebar streak, pin-drop map, popup, leaderboard & profile" \
  --body "$(cat <<'EOF'
## Summary
Visual/layout redesign of the Next.js frontend (Phase A of the redesign spec).

- **Auth:** gradient backdrop + two-pane (brand + form) login/register card
- **Navbar:** full-width, links spread out
- **Reports sidebar:** streak + signals header (ported from the main-branch sidebar)
- **New report:** interactive pin-drop map with "use my location" (replaces lat/lng inputs)
- **Map marker popup:** restyled to the site's token system
- **Leaderboard & Profile:** wide multi-column desktop dashboards
- lucide icons only — no emojis

## Out of scope (follow-up phase)
Backend connection + virtualization/hosting.

## Spec / Plan
- docs/superpowers/specs/2026-06-05-frontend-redesign-design.md
- docs/superpowers/plans/2026-06-05-frontend-redesign.md

## Test plan
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` all pass
- Manual: verify each surface on mobile + desktop widths

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR created against `dev`.

---

## Self-Review

**Spec coverage:** All 7 spec items map to Tasks 1–7; PR + verification in Task 8. ✓
- Login gradient + lengthy/less-blocky → Task 1
- Navbar wider → Task 2
- Sidebar streak header → Task 3
- New-report pin-drop + use-my-location → Task 4
- Marker popup restyle → Task 5
- Leaderboard wider/multi-column → Task 6
- Profile wider/multi-column → Task 7
- No emoji / lucide only → enforced throughout + Task 6 removes `★`, Task 8 greps
- PR to dev → Task 8

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `ReportsClient` prop `user: User | null` matches the page passing `user`. `LocationPicker` props `{lat, lng, onChange}` match `NewReportForm` usage. `geo.ts` exports (`SOFIA_CENTER`, `clampLat`, `clampLng`, `formatCoords`) match both test and consumers. `mapApiUser`/`usersApi.getMe` already exist in `@/lib/api`. ✓
