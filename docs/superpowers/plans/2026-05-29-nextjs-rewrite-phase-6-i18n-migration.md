# Next.js Rewrite — Phase 6: i18n Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every inline Cyrillic and Bulgarian-only English UI string out of components/data files into the existing `messages/bg.json` + `messages/en.json` catalogs, and add a Navbar locale switcher. After Phase 6, switching between `/bg/*` and `/en/*` swaps every visible string.

**Architecture:** The i18n infrastructure already exists: `next-intl@^4.12.0`, `src/proxy.ts` chains the intl middleware with the auth gate, `src/i18n/routing.ts` defines `["bg","en"]` with default `bg`, `src/i18n/request.ts` loads the right catalog. Phase 6 is purely a string-extraction + catalog-population exercise plus one new client component (`LocaleSwitcher`). Server components use `getTranslations(ns)`; client components use `useTranslations(ns)`. Data catalogs (`badges.ts`, `rewards.ts`) get reduced to ID-only — display strings move to `messages/*.json` keyed by id (`Badges.first_report.name`, `RewardCatalog.1.name`). `LEVEL_THRESHOLDS` in `mappers.ts` switches its `level` field from "НОВИЧ" to "novice" (a stable key); render-time components look up via `t("Levels." + user.level)`.

**Tech Stack:** Next.js 16 App Router, next-intl 4.x, vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` §i18n (lines 196-219) + §Implementation Phases #6 (line 282)
**Prior plan:** `docs/superpowers/plans/2026-05-28-nextjs-rewrite-phase-5-leaderboard-profile-rewards.md`

---

## File Structure

```
frontend-next/
├── messages/
│   ├── bg.json                                  # MODIFIED: + Severity, Status, Reports, ReportDetail, NewReport, Levels, Leaderboard, Profile, Rewards, RewardCatalog, Badges, LocaleSwitcher namespaces
│   └── en.json                                  # MODIFIED: same shape, English values
├── src/
│   ├── lib/api/
│   │   ├── mappers.ts                           # MODIFIED: LEVEL_THRESHOLDS uses keys ("novice"…"legend") instead of labels
│   │   └── mappers.test.ts                      # MODIFIED: assert keys not labels
│   ├── lib/data/
│   │   ├── badges.ts                            # MODIFIED: drop `name`/`desc` fields (now in messages/*.Badges.<id>.*)
│   │   └── rewards.ts                           # MODIFIED: drop `name`/`desc`/`partner` (now in messages/*.RewardCatalog.<id>.*)
│   ├── components/
│   │   ├── nav/
│   │   │   ├── Navbar.tsx                       # MODIFIED: render <LocaleSwitcher /> on the right
│   │   │   └── LocaleSwitcher.tsx               # NEW: Globe dropdown that calls router.replace under new locale
│   │   ├── reports/
│   │   │   ├── ReportCard.tsx                   # MODIFIED: useTranslations("Severity") for label
│   │   │   ├── ReportsClient.tsx                # MODIFIED: useTranslations("Reports") for count + empty + loading
│   │   │   ├── MapView.tsx                      # MODIFIED: pass t() into createMarkerElement OR shift loading text to ReportsClient (already done)
│   │   │   └── MarkerPopup.tsx                  # MODIFIED: useTranslations("Severity", "ReportDetail") for label + "OPEN →"
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardClient.tsx            # MODIFIED: useTranslations("Leaderboard")
│   │   │   └── LeaderRow.tsx                    # MODIFIED: useTranslations("Leaderboard"/"Levels"); look up user.level via t()
│   │   ├── profile/
│   │   │   ├── ProfileClient.tsx                # MODIFIED: useTranslations("Profile")
│   │   │   ├── ProfileHero.tsx                  # MODIFIED: t("Profile.verified"), t("Levels.<key>")
│   │   │   ├── XpBar.tsx                        # MODIFIED: t("Profile.xpToNext")
│   │   │   ├── StatCards.tsx                    # MODIFIED: t("Profile.stats.*")
│   │   │   ├── StatBars.tsx                     # MODIFIED: t("Profile.stats.*"); streak val: t("Profile.stats.streakDays", { n })
│   │   │   ├── BadgeGrid.tsx                    # MODIFIED: t("Profile.badges.unlocked"), t("Badges.<id>.name|desc")
│   │   │   ├── ActivityChart.tsx                # MODIFIED: t("Profile.activity.last4weeks"), DAYS via t("Profile.activity.days.<k>")
│   │   │   └── SettingsPanel.tsx                # MODIFIED: t("Profile.settings.*")
│   │   ├── rewards/
│   │   │   ├── RewardsClient.tsx                # MODIFIED: useTranslations("Rewards"); claim toast uses t with var
│   │   │   ├── RewardsHero.tsx                  # MODIFIED: t("Rewards.hero.*")
│   │   │   ├── RewardCard.tsx                   # MODIFIED: t("Rewards.card.*"), t("RewardCatalog.<id>.*")
│   │   │   ├── ClaimConfirm.tsx                 # MODIFIED: t("Rewards.claim.*"), t("RewardCatalog.<id>.*")
│   │   │   └── HistoryList.tsx                  # MODIFIED: t("Rewards.history.empty")
│   │   └── auth/LoginCard.tsx                   # UNCHANGED (already uses t)
│   └── app/[locale]/(app)/
│       ├── reports/[id]/page.tsx                # MODIFIED: getTranslations for back + actions + severity + status
│       ├── reports/new/page.tsx                 # MODIFIED: getTranslations for title + back
│       ├── leaderboard/page.tsx                 # UNCHANGED (no inline strings)
│       ├── profile/page.tsx                     # UNCHANGED
│       └── rewards/page.tsx                     # UNCHANGED
```

**Conventions used throughout this plan:**
- Server components → `import { getTranslations } from "next-intl/server"` then `const t = await getTranslations("Namespace")`.
- Client components → `import { useTranslations } from "next-intl"` then `const t = useTranslations("Namespace")`.
- ICU placeholders: `t("key", { n: 5 })` with catalog like `"key": "Още {n} точки"`.
- Hyphenated runtime values (`"in-progress"`) are mapped to camelCase keys inside the component before calling `t()`.

---

## Task 1: LocaleSwitcher component + Navbar wiring

The spec says: "Locale switcher: Navbar dropdown with lucide `Globe`. Switching uses `router.replace` under the new locale prefix." Since `localePrefix: "always"`, replacing `/bg/...` with `/en/...` is a simple path-segment swap.

**Files:**
- Create: `frontend-next/src/components/nav/LocaleSwitcher.tsx`
- Modify: `frontend-next/src/components/nav/Navbar.tsx`
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json` (add `LocaleSwitcher` namespace)

- [ ] **Step 1: Add the LocaleSwitcher namespace to both catalogs**

Append to the top-level object in `frontend-next/messages/bg.json`:

```json
"LocaleSwitcher": {
  "label": "Език",
  "bg": "Български",
  "en": "Английски"
}
```

Append to `frontend-next/messages/en.json`:

```json
"LocaleSwitcher": {
  "label": "Language",
  "bg": "Bulgarian",
  "en": "English"
}
```

- [ ] **Step 2: Create LocaleSwitcher**

`frontend-next/src/components/nav/LocaleSwitcher.tsx`:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === locale) return;
    // pathname looks like "/bg/reports/123" — swap first segment
    const segments = pathname.split("/");
    segments[1] = next;
    const target = segments.join("/") || `/${next}`;
    startTransition(() => router.replace(target));
  }

  return (
    <label className="flex items-center gap-1.5 text-text-2 text-xs">
      <Globe size={14} strokeWidth={1.8} />
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        value={locale}
        onChange={onChange}
        className="bg-transparent text-text-2 uppercase tracking-wider text-xs outline-none cursor-pointer hover:text-text-1"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} className="bg-bg-card text-text-1">
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 3: Render LocaleSwitcher in Navbar**

Read `frontend-next/src/components/nav/Navbar.tsx` to find a good insertion point on the right-hand side. Add the import:

```tsx
import { LocaleSwitcher } from "./LocaleSwitcher";
```

Render `<LocaleSwitcher />` adjacent to the logout/profile area (whichever element sits at the far right of the existing Navbar). If the Navbar uses a `<ul>` of links followed by a logout `<form>`, place `<LocaleSwitcher />` between them.

- [ ] **Step 4: Build + smoke check**

```bash
cd frontend-next && npm run build 2>&1 | tail -10
```

Expected: green build, route table unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/LocaleSwitcher.tsx src/components/nav/Navbar.tsx messages/bg.json messages/en.json
git commit -m "feat(next): locale switcher in Navbar"
```

---

## Task 2: Severity + Status + Reports namespaces (TDD-light, build verified)

Extract severity labels (ReportCard, MarkerPopup, ReportDetail), status labels (ReportDetail), and the small Reports list strings.

**Files:**
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json`
- Modify: `frontend-next/src/components/reports/ReportCard.tsx`
- Modify: `frontend-next/src/components/reports/ReportsClient.tsx`
- Modify: `frontend-next/src/components/reports/MarkerPopup.tsx`
- Modify: `frontend-next/src/app/[locale]/(app)/reports/[id]/page.tsx`

- [ ] **Step 1: Add namespaces**

`messages/bg.json` (append):

```json
"Severity": {
  "critical": "КРИТИЧНО",
  "high": "СЕРИОЗНО",
  "medium": "СРЕДНО",
  "low": "ЛЕКО"
},
"Status": {
  "open": "ОТВОРЕН",
  "inProgress": "В ПРОЦЕС",
  "done": "ЗАТВОРЕН"
},
"Reports": {
  "signalsCount": "{n} сигнала",
  "noMatch": "Няма сигнали отговарящи на филтрите.",
  "loadingMap": "Зареждане на картата…"
},
"ReportDetail": {
  "back": "обратно към сигналите",
  "claim": "Поеми",
  "markComplete": "Маркирай готово",
  "confirmSighting": "Потвърди наблюдение",
  "unknownReporter": "—",
  "openLink": "ОТВОРИ →"
}
```

`messages/en.json` (append):

```json
"Severity": {
  "critical": "CRITICAL",
  "high": "HIGH",
  "medium": "MEDIUM",
  "low": "LOW"
},
"Status": {
  "open": "OPEN",
  "inProgress": "IN PROGRESS",
  "done": "DONE"
},
"Reports": {
  "signalsCount": "{n} signals",
  "noMatch": "No reports match the current filters.",
  "loadingMap": "Loading map…"
},
"ReportDetail": {
  "back": "back to reports",
  "claim": "Claim",
  "markComplete": "Mark complete",
  "confirmSighting": "Confirm sighting",
  "unknownReporter": "—",
  "openLink": "OPEN →"
}
```

- [ ] **Step 2: Migrate ReportCard**

Open `frontend-next/src/components/reports/ReportCard.tsx`. Replace the `SEVERITY_BADGE` table — keep colors/bg but drop `label`. Add `useTranslations("Severity")` and use `t(report.severity)`:

```tsx
"use client";

import type { Report } from "@/lib/api/mappers";
import { MapPin, Flame } from "lucide-react";
import { useTranslations } from "next-intl";

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: "#FF2D55", bg: "rgba(255,45,85,0.12)" },
  high:     { color: "#FF9F0A", bg: "rgba(255,159,10,0.12)" },
  medium:   { color: "#FFD60A", bg: "rgba(255,214,10,0.12)" },
  low:      { color: "#30D158", bg: "rgba(48,209,88,0.12)" },
};

interface ReportCardProps {
  report: Report;
  selected: boolean;
  onSelect: () => void;
}

export function ReportCard({ report, selected, onSelect }: ReportCardProps) {
  const tSev = useTranslations("Severity");
  const sev = SEVERITY_STYLES[report.severity] ?? SEVERITY_STYLES.medium;
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
          className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1"
          style={{ color: sev.color, background: sev.bg }}
        >
          <Flame size={10} /> {tSev(report.severity as "critical" | "high" | "medium" | "low")}
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

- [ ] **Step 3: Migrate ReportsClient**

In `frontend-next/src/components/reports/ReportsClient.tsx`:
- Add `import { useTranslations } from "next-intl";`
- Inside the component: `const t = useTranslations("Reports");`
- Replace literal `"Loading map…"` (inside `dynamic({ loading })`) with `t("loadingMap")` — but that loading fn runs outside the component scope, so move it inside:

```tsx
const MapView = dynamic(() => import("./MapView"), { ssr: false });
```

And add a `<div>` fallback driven by a `useState` if a real loading state is needed. **Simpler:** keep the static fallback in English ("Loading map…") since it flashes for ~100ms and is acceptably bilingual; document this with a one-line comment. Choose this simpler path — it avoids restructuring the dynamic import.

- Replace `{filtered.length} signals` → `{t("signalsCount", { n: filtered.length })}`
- Replace `"No reports match the current filters."` → `{t("noMatch")}`

- [ ] **Step 4: Migrate MarkerPopup**

In `frontend-next/src/components/reports/MarkerPopup.tsx`:

```tsx
"use client";

import type { Report } from "@/lib/api/mappers";
import { MapPin, Flame, User } from "lucide-react";
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
    <div className="rounded-2xl bg-[#0F172A] border border-white/10 overflow-hidden text-text-1 w-[320px]">
      <div className="px-4 py-3 border-b border-white/5" style={{ background: `${color}15` }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color }}>
          <Flame size={12} />
          {tSev(report.severity as "critical" | "high" | "medium" | "low")}
          <span className="ml-auto text-text-3">{report.time}</span>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="text-sm text-text-1">{report.description}</div>
        <div className="flex items-center gap-1.5 text-xs text-text-3">
          <MapPin size={12} /> {report.district}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-3">
          <User size={12} /> {report.reporter || tRD("unknownReporter")}
        </div>
        <a
          href={`/${locale}/reports/${report.id}`}
          className="mt-2 text-xs uppercase tracking-wider text-accent-pink hover:text-pink-light"
        >
          {tRD("openLink")}
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Migrate ReportDetail page**

In `frontend-next/src/app/[locale]/(app)/reports/[id]/page.tsx`, after `const { locale, id } = await params;`:

```tsx
import { getTranslations } from "next-intl/server";

// inside the function, after locale destructure:
const tSev = await getTranslations("Severity");
const tStatus = await getTranslations("Status");
const tRD = await getTranslations("ReportDetail");

const STATUS_KEY = { open: "open", "in-progress": "inProgress", done: "done" } as const;
```

Then in the JSX:

```tsx
<Link ...> <ArrowLeft size={14} /> {tRD("back")} </Link>
...
<Flame size={12} /> {tSev(report.severity as "critical" | "high" | "medium" | "low")}
...
<span className="ml-auto ...">{tStatus(STATUS_KEY[report.status])}</span>
...
<User size={14} /> {report.reporter || tRD("unknownReporter")}
...
<Button type="submit">{tRD("claim")}</Button>
...
<Button type="submit">{tRD("markComplete")}</Button>
...
<Button type="submit" variant="outline">{tRD("confirmSighting")}</Button>
```

- [ ] **Step 6: Build + commit**

```bash
npm run build 2>&1 | tail -10   # expect green
git add messages/ src/components/reports/ 'src/app/[locale]/(app)/reports/[id]'
git commit -m "feat(next): i18n migration for severity, status, reports list, report detail"
```

---

## Task 3: NewReport extraction

**Files:**
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json`
- Modify: `frontend-next/src/app/[locale]/(app)/reports/new/page.tsx`
- Modify: `frontend-next/src/components/reports/NewReportForm.tsx`

- [ ] **Step 1: Add NewReport namespace**

`messages/bg.json`:

```json
"NewReport": {
  "title": "НОВ СИГНАЛ",
  "back": "обратно",
  "description": "Описание",
  "descriptionPlaceholder": "Какво видяхте?",
  "latitude": "Ширина",
  "longitude": "Дължина",
  "severity": "Сериозност",
  "severityCritical": "Критично",
  "severityHigh": "Сериозно",
  "severityMedium": "Средно",
  "severityLow": "Леко",
  "photo": "Снимка (по избор)",
  "submit": "Изпрати сигнал",
  "submitting": "Изпращане...",
  "failure": "Изпращането се провали"
}
```

`messages/en.json`:

```json
"NewReport": {
  "title": "NEW SIGNAL",
  "back": "back",
  "description": "Description",
  "descriptionPlaceholder": "What did you see?",
  "latitude": "Latitude",
  "longitude": "Longitude",
  "severity": "Severity",
  "severityCritical": "Critical",
  "severityHigh": "High",
  "severityMedium": "Medium",
  "severityLow": "Low",
  "photo": "Photo (optional)",
  "submit": "Submit report",
  "submitting": "Submitting...",
  "failure": "Submission failed"
}
```

- [ ] **Step 2: Migrate new/page.tsx**

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NewReportForm } from "@/components/reports/NewReportForm";

export default async function NewReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("NewReport");
  return (
    <main className="max-w-xl mx-auto px-4 py-8 flex flex-col gap-6">
      <Link href={`/${locale}/reports`} className="text-text-3 text-xs uppercase tracking-wider hover:text-text-1 flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> {t("back")}
      </Link>
      <div className="rounded-2xl border border-brand-border bg-bg-card p-6">
        <h1 className="text-text-1 text-xl tracking-widest mb-4" style={{ fontFamily: "var(--font-display)" }}>
          {t("title")}
        </h1>
        <NewReportForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Migrate NewReportForm**

In `frontend-next/src/components/reports/NewReportForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createReport } from "@/lib/actions/reports";

export function NewReportForm() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const t = useTranslations("NewReport");

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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="latitude" className="text-text-2 text-xs uppercase tracking-wider">{t("latitude")}</Label>
          <Input id="latitude" name="latitude" type="number" step="any" required defaultValue="42.6977" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="longitude" className="text-text-2 text-xs uppercase tracking-wider">{t("longitude")}</Label>
          <Input id="longitude" name="longitude" type="number" step="any" required defaultValue="23.3219" />
        </div>
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

- [ ] **Step 4: Build + commit**

```bash
npm run build 2>&1 | tail -10
git add messages/ src/components/reports/NewReportForm.tsx 'src/app/[locale]/(app)/reports/new'
git commit -m "feat(next): i18n migration for new-report page + form"
```

---

## Task 4: Levels namespace + mapper key change (TDD)

`LEVEL_THRESHOLDS` currently stores the Bulgarian label as `level`. Migrate to stable English keys (`novice`, `active`, `pro`, `master`, `legend`); render-time components look up via `t("Levels." + user.level)`.

**Files:**
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json`
- Modify: `frontend-next/src/lib/api/mappers.ts`
- Modify: `frontend-next/src/lib/api/mappers.test.ts`

- [ ] **Step 1: Add Levels namespace**

`messages/bg.json`:

```json
"Levels": {
  "novice": "НОВИЧ",
  "active": "АКТИВЕН",
  "pro": "ПРО",
  "master": "МАСТЪР",
  "legend": "ЛЕГЕНДА"
}
```

`messages/en.json`:

```json
"Levels": {
  "novice": "NOVICE",
  "active": "ACTIVE",
  "pro": "PRO",
  "master": "MASTER",
  "legend": "LEGEND"
}
```

- [ ] **Step 2: Update mapper tests**

Open `frontend-next/src/lib/api/mappers.test.ts`. Replace the `deriveLevel` test block:

```ts
describe("deriveLevel", () => {
  it("returns novice for 0-499 points", () => {
    expect(deriveLevel(0)).toMatchObject({ level: "novice", levelIcon: "sprout", nextLevelPts: 500 });
    expect(deriveLevel(499)).toMatchObject({ level: "novice" });
  });
  it("returns active for 500-1499", () => {
    expect(deriveLevel(500).level).toBe("active");
    expect(deriveLevel(1499).level).toBe("active");
  });
  it("returns pro / master / legend at the right thresholds", () => {
    expect(deriveLevel(1500).level).toBe("pro");
    expect(deriveLevel(3000).level).toBe("master");
    expect(deriveLevel(5000).level).toBe("legend");
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npm test 2>&1 | grep -E "FAIL|deriveLevel|✓|✗" | head -10
```

Expected: `deriveLevel` tests fail because the mapper still returns Bulgarian labels.

- [ ] **Step 4: Update mappers.ts LEVEL_THRESHOLDS**

In `frontend-next/src/lib/api/mappers.ts`:

```ts
const LEVEL_THRESHOLDS = [
  { level: "novice",  icon: "sprout", min: 0,    max: 499 },
  { level: "active",  icon: "award",  min: 500,  max: 1499 },
  { level: "pro",     icon: "medal",  min: 1500, max: 2999 },
  { level: "master",  icon: "gem",    min: 3000, max: 4999 },
  { level: "legend",  icon: "trophy", min: 5000, max: Infinity },
];
```

Also update the inline `district` / `title` fallbacks in `mapApiReport` from `"София"` / `"Сигнал"` to use English defaults that the UI never displays directly:

```ts
title: desc ? desc.slice(0, 50) : "",   // empty title fallback; UI shows description anyway
district: (data.district as string) ?? "",
```

(If something currently depends on the "София" fallback to display anything, the UI should fall back to `t("Common.unknown")` instead. Quick grep shows the district shows up only as `{report.district}` next to a MapPin icon — empty string just renders nothing, which is acceptable for an unknown district.)

- [ ] **Step 5: Pass + commit**

```bash
npm test 2>&1 | tail -6   # expect: 55 passing
git add src/lib/api/mappers.ts src/lib/api/mappers.test.ts messages/
git commit -m "feat(next): switch level mapper to stable keys; add Levels namespace"
```

---

## Task 5: Leaderboard extraction

**Files:**
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json`
- Modify: `frontend-next/src/components/leaderboard/LeaderboardClient.tsx`
- Modify: `frontend-next/src/components/leaderboard/LeaderRow.tsx`

- [ ] **Step 1: Add Leaderboard namespace**

`messages/bg.json`:

```json
"Leaderboard": {
  "title": "КЛАСАЦИЯ",
  "yourPosition": "ТВОЯТА ПОЗИЦИЯ",
  "you": "ТИ",
  "tabs": {
    "awards": "НАГРАДИ",
    "cleanings": "ПОЧИСТВАНИЯ",
    "points": "ТОЧКИ"
  },
  "labels": {
    "awards": "НАГРАДИ",
    "cleanings": "ПОЧИСТВАНИЯ",
    "points": "ТОЧКИ"
  }
}
```

`messages/en.json`:

```json
"Leaderboard": {
  "title": "LEADERBOARD",
  "yourPosition": "YOUR POSITION",
  "you": "YOU",
  "tabs": {
    "awards": "AWARDS",
    "cleanings": "CLEANINGS",
    "points": "POINTS"
  },
  "labels": {
    "awards": "AWARDS",
    "cleanings": "CLEANINGS",
    "points": "POINTS"
  }
}
```

- [ ] **Step 2: Migrate LeaderboardClient**

In `frontend-next/src/components/leaderboard/LeaderboardClient.tsx`, move `TABS` inside the component and translate:

```tsx
"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LeaderboardUser, User } from "@/lib/api/mappers";
import { Podium } from "./Podium";
import { LeaderRow, type SortBy } from "./LeaderRow";

interface Props {
  users: LeaderboardUser[];
  me: User;
}

export function LeaderboardClient({ users, me }: Props) {
  const t = useTranslations("Leaderboard");
  const [sortBy, setSortBy] = useState<SortBy>("awards");

  const TABS: { id: SortBy; label: string }[] = [
    { id: "awards",    label: t("tabs.awards") },
    { id: "cleanings", label: t("tabs.cleanings") },
    { id: "points",    label: t("tabs.points") },
  ];

  const sorted = useMemo(() => {
    const cmp = (a: LeaderboardUser, b: LeaderboardUser) =>
      sortBy === "awards" ? b.awards - a.awards :
      sortBy === "cleanings" ? b.cleanings - a.cleanings :
      b.points - a.points;
    return [...users].sort(cmp).map((u, i) => ({ ...u, rank: i + 1 }));
  }, [users, sortBy]);

  const myEntry = sorted.find((u) => u.id === me.id);
  const top3 = sorted.slice(0, 3);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <h1 className="text-text-1 text-xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
        {t("title")}
      </h1>

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

      <Podium top3={top3} />

      {myEntry && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-accent-pink-border bg-accent-pink-dim text-sm">
          <span className="text-text-2 text-xs uppercase tracking-wider">{t("yourPosition")}</span>
          <span className="text-text-1">
            #{myEntry.rank} ·{" "}
            {sortBy === "awards" ? myEntry.awards :
             sortBy === "cleanings" ? myEntry.cleanings :
             myEntry.points.toLocaleString()}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((u, idx) => (
          <LeaderRow key={u.id} user={u} isMe={u.id === me.id} index={idx} sortBy={sortBy} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Migrate LeaderRow**

In `frontend-next/src/components/leaderboard/LeaderRow.tsx`, translate the "AWARDS"/"CLEANINGS"/"POINTS" label, the "YOU" chip, and `{user.level}` (now a key like "novice"). Keep numeric value formatting unchanged:

```tsx
"use client";

import { Check, Flame, Paintbrush, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LeaderboardUser } from "@/lib/api/mappers";

const RANK_COLORS = ["#ffffff", "#aaaaaa", "#777777"];

export type SortBy = "awards" | "cleanings" | "points";

export function LeaderRow({ user, isMe, index, sortBy }: { user: LeaderboardUser; isMe: boolean; index: number; sortBy: SortBy }) {
  const tLb = useTranslations("Leaderboard");
  const tLevels = useTranslations("Levels");
  const rankColor = index < 3 ? RANK_COLORS[index] : undefined;

  const value =
    sortBy === "awards" ? user.awards :
    sortBy === "cleanings" ? user.cleanings :
    user.points;

  const label = tLb(`labels.${sortBy}`);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition animate-fade-up ${
        isMe ? "border-accent-pink-border bg-accent-pink-dim" : "border-brand-border bg-bg-card"
      }`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div
        className="w-8 h-8 grid place-items-center rounded-md text-xs"
        style={{
          background: rankColor ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
          border: rankColor ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
          color: rankColor ?? "var(--color-text-3)",
        }}
      >
        #{index + 1}
      </div>

      <span className="w-10 h-10 grid place-items-center rounded-full bg-brand-primary-dim text-text-1 text-sm">
        {user.avatar}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-text-1 text-sm">
          {user.name}
          {user.verified && (
            <span className="grid place-items-center w-4 h-4 rounded-full bg-accent-pink text-bg-base">
              <Check size={10} strokeWidth={3} />
            </span>
          )}
          {isMe && <span className="px-1.5 py-0.5 rounded text-[0.625rem] uppercase tracking-wider bg-accent-pink-dim text-accent-pink">{tLb("you")}</span>}
        </div>
        <div className="flex items-center gap-2 text-text-3 text-xs mt-0.5">
          <span>{tLevels(user.level as "novice" | "active" | "pro" | "master" | "legend")}</span>
          {user.streak > 0 && <span>· <Flame size={10} strokeWidth={2} className="inline" /> {user.streak}</span>}
          <span>· <Paintbrush size={10} strokeWidth={2} className="inline" /> {user.cleanings}</span>
        </div>
        {sortBy === "awards" && user.earnedBadges.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-text-3 text-xs">
            {user.earnedBadges.slice(0, 3).map((b) => (
              <span key={b.id}>★</span>
            ))}
            {user.earnedBadges.length > 3 && <span className="text-text-3">+{user.earnedBadges.length - 3}</span>}
          </div>
        )}
      </div>

      <div className="text-right">
        <div className="text-text-1 text-base" style={{ color: rankColor }}>{value.toLocaleString()}</div>
        <div className="text-text-3 text-[0.625rem] uppercase tracking-wider flex items-center gap-1 justify-end">
          {sortBy === "awards" && <Trophy size={10} strokeWidth={2} />} {label}
        </div>
      </div>
    </div>
  );
}
```

(Note: dropped the `title={b.name}` tooltip from the badge stars since `b.name` no longer exists post-Task 7. We add it back in Task 7 using `t("Badges." + b.id + ".name")`.)

- [ ] **Step 4: Build + commit**

```bash
npm run build 2>&1 | tail -10   # expect green; Cyrillic gone from these two files
git add messages/ src/components/leaderboard/
git commit -m "feat(next): i18n migration for leaderboard (client + row)"
```

---

## Task 6: Profile extraction (excluding badges — that's Task 7)

**Files:**
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json`
- Modify: `frontend-next/src/components/profile/ProfileClient.tsx`
- Modify: `frontend-next/src/components/profile/ProfileHero.tsx`
- Modify: `frontend-next/src/components/profile/XpBar.tsx`
- Modify: `frontend-next/src/components/profile/StatCards.tsx`
- Modify: `frontend-next/src/components/profile/StatBars.tsx`
- Modify: `frontend-next/src/components/profile/ActivityChart.tsx`
- Modify: `frontend-next/src/components/profile/SettingsPanel.tsx`

- [ ] **Step 1: Add Profile namespace (excluding badges keys — Task 7)**

`messages/bg.json`:

```json
"Profile": {
  "verified": "VERIFIED",
  "xpToNext": "Към следващо ниво",
  "tabs": {
    "stats": "СТАТИСТИКИ",
    "badges": "БЕЙДЖОВЕ",
    "activity": "АКТИВНОСТ",
    "settings": "НАСТРОЙКИ"
  },
  "stats": {
    "points": "ТОЧКИ",
    "cleanings": "ПОЧИСТВАНИЯ",
    "reports": "СИГНАЛИ",
    "totalPoints": "ОБЩО ТОЧКИ",
    "streakRecord": "РЕКОРД НА СТРИЙК",
    "streakDays": "{n} дни"
  },
  "activity": {
    "last4weeks": "Последни 4 седмици",
    "days": { "mon": "П", "tue": "В", "wed": "С", "thu": "Ч", "fri": "П", "sat": "С", "sun": "Н" }
  },
  "settings": {
    "pushNotifs": "Push уведомления",
    "pushNotifsDesc": "Известия в браузъра при нови сигнали",
    "gps": "GPS",
    "gpsDesc": "Локация при подаване на сигнал",
    "emails": "Имейли",
    "emailsDesc": "Седмично резюме",
    "logout": "ИЗХОД"
  }
}
```

`messages/en.json`:

```json
"Profile": {
  "verified": "VERIFIED",
  "xpToNext": "To next level",
  "tabs": {
    "stats": "STATS",
    "badges": "BADGES",
    "activity": "ACTIVITY",
    "settings": "SETTINGS"
  },
  "stats": {
    "points": "POINTS",
    "cleanings": "CLEANINGS",
    "reports": "REPORTS",
    "totalPoints": "TOTAL POINTS",
    "streakRecord": "STREAK RECORD",
    "streakDays": "{n} days"
  },
  "activity": {
    "last4weeks": "Last 4 weeks",
    "days": { "mon": "M", "tue": "T", "wed": "W", "thu": "T", "fri": "F", "sat": "S", "sun": "S" }
  },
  "settings": {
    "pushNotifs": "Push notifications",
    "pushNotifsDesc": "Browser alerts on new reports",
    "gps": "GPS",
    "gpsDesc": "Location when filing a report",
    "emails": "Email",
    "emailsDesc": "Weekly digest",
    "logout": "LOG OUT"
  }
}
```

- [ ] **Step 2: Migrate ProfileClient**

In `frontend-next/src/components/profile/ProfileClient.tsx`, move TABS inside and translate:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@/lib/api/mappers";
import { ProfileHero } from "./ProfileHero";
import { XpBar } from "./XpBar";
import { StatCards } from "./StatCards";
import { StatBars } from "./StatBars";
import { BadgeGrid } from "./BadgeGrid";
import { ActivityChart } from "./ActivityChart";
import { SettingsPanel } from "./SettingsPanel";

type Tab = "stats" | "badges" | "activity" | "settings";

export function ProfileClient({ user }: { user: User }) {
  const t = useTranslations("Profile");
  const [tab, setTab] = useState<Tab>("stats");

  const TABS: { id: Tab; label: string }[] = [
    { id: "stats",    label: t("tabs.stats") },
    { id: "badges",   label: t("tabs.badges") },
    { id: "activity", label: t("tabs.activity") },
    { id: "settings", label: t("tabs.settings") },
  ];

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <ProfileHero user={user} />

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

      <XpBar user={user} />
      <StatCards user={user} />

      {tab === "stats"    && <StatBars user={user} />}
      {tab === "badges"   && <BadgeGrid user={user} />}
      {tab === "activity" && <ActivityChart />}
      {tab === "settings" && <SettingsPanel />}
    </main>
  );
}
```

- [ ] **Step 3: Migrate ProfileHero**

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { User } from "@/lib/api/mappers";

export function ProfileHero({ user }: { user: User }) {
  const t = useTranslations("Profile");
  const tLevels = useTranslations("Levels");
  return (
    <div className="relative rounded-2xl border border-brand-border bg-bg-card p-6 flex items-center gap-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 30% 30%, var(--color-accent-pink-glow), transparent 60%)" }} />
      <div className="relative w-16 h-16 grid place-items-center rounded-full bg-brand-primary-dim text-text-1 text-xl font-medium">
        {user.avatar}
      </div>
      <div className="relative flex-1">
        <div className="flex items-center gap-2 text-text-1 text-xl">
          {user.name}
          {user.verified && (
            <span className="px-1.5 py-0.5 rounded text-[0.625rem] uppercase tracking-wider bg-accent-pink-dim text-accent-pink border border-accent-pink-border">
              {t("verified")}
            </span>
          )}
        </div>
        <div className="text-text-2 text-xs uppercase tracking-wider mt-1">
          {tLevels(user.level as "novice" | "active" | "pro" | "master" | "legend")}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Migrate XpBar**

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { User } from "@/lib/api/mappers";

export function XpBar({ user }: { user: User }) {
  const t = useTranslations("Profile");
  const next = user.nextLevelPts;
  const pct = next > user.points ? Math.min((user.points / next) * 100, 100) : 100;
  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4">
      <div className="flex items-center justify-between text-text-2 text-xs uppercase tracking-wider mb-2">
        <span>{t("xpToNext")}</span>
        <span className="text-text-1">{user.points.toLocaleString()} / {next === Infinity ? "∞" : next.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-primary-dim overflow-hidden">
        <div className="h-full bg-accent-pink transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Migrate StatCards**

```tsx
"use client";

import { Star, Paintbrush, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { User } from "@/lib/api/mappers";

export function StatCards({ user }: { user: User }) {
  const t = useTranslations("Profile.stats");
  const items = [
    { icon: Star,       val: user.points.toLocaleString(), label: t("points") },
    { icon: Paintbrush, val: user.cleanings,               label: t("cleanings") },
    { icon: MapPin,     val: user.reports,                 label: t("reports") },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, val, label }) => (
        <div key={label} className="rounded-xl border border-brand-border bg-bg-card p-4 flex flex-col items-center gap-1">
          <Icon size={18} strokeWidth={1.8} className="text-text-2" />
          <div className="text-text-1 text-lg">{val}</div>
          <div className="text-text-3 text-[0.625rem] uppercase tracking-wider">{label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Migrate StatBars**

```tsx
"use client";

import { Star, Paintbrush, MapPin, Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import type { User } from "@/lib/api/mappers";

export function StatBars({ user }: { user: User }) {
  const t = useTranslations("Profile.stats");
  const items = [
    { icon: Star,       key: t("totalPoints"),  val: user.points.toLocaleString(),               pct: user.points / 5000 },
    { icon: Paintbrush, key: t("cleanings"),    val: user.cleanings.toString(),                  pct: user.cleanings / 50 },
    { icon: MapPin,     key: t("reports"),      val: user.reports.toString(),                    pct: user.reports / 30 },
    { icon: Flame,      key: t("streakRecord"), val: t("streakDays", { n: user.streak }),        pct: user.streak / 30 },
  ];
  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      {items.map(({ icon: Icon, key, val, pct }) => (
        <div key={key} className="rounded-xl border border-brand-border bg-bg-card p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider">
            <span className="text-text-2 flex items-center gap-1.5"><Icon size={13} strokeWidth={1.8} /> {key}</span>
            <span className="text-text-1">{val}</span>
          </div>
          <div className="h-1 mt-2 rounded-full bg-brand-primary-dim overflow-hidden">
            <div className="h-full bg-text-2" style={{ width: `${Math.min(pct * 100, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Migrate ActivityChart**

```tsx
"use client";

import { useTranslations } from "next-intl";

const WEEK_DATA = [
  [2, 5, 1, 3, 6, 4, 2],
  [4, 3, 7, 2, 5, 8, 3],
  [1, 6, 3, 5, 2, 4, 7],
  [5, 3, 6, 4, 7, 2, 5],
];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const CHART_MAX = Math.max(...WEEK_DATA.flat());

export function ActivityChart() {
  const t = useTranslations("Profile.activity");
  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4 animate-fade-up">
      <div className="text-text-3 text-xs uppercase tracking-wider mb-3">{t("last4weeks")}</div>
      <div className="flex flex-col gap-1.5">
        {WEEK_DATA.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((val, di) => (
              <div key={di} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: Math.max(4, (val / CHART_MAX) * 44),
                    background: `rgba(255,255,255,${val > 0 ? 0.1 + (val / CHART_MAX) * 0.5 : 0.04})`,
                    border: `1px solid rgba(255,255,255,${val > 0 ? 0.2 : 0.07})`,
                  }}
                />
                {wi === WEEK_DATA.length - 1 && (
                  <span className="text-text-3 text-[0.625rem]">{t(`days.${DAY_KEYS[di]}`)}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Migrate SettingsPanel**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

function Toggle({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-brand-border last:border-b-0">
      <div className="flex-1">
        <div className="text-text-1 text-sm">{label}</div>
        <div className="text-text-3 text-xs mt-0.5">{desc}</div>
      </div>
      <button
        onClick={onToggle}
        aria-pressed={value}
        className={`relative w-10 h-5 rounded-full transition ${value ? "bg-accent-pink" : "bg-brand-primary-dim"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-text-1 transition-all ${value ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function useStoredFlag(key: string, defaultOn: boolean) {
  const [v, setV] = useState(() => {
    if (typeof window === "undefined") return defaultOn;
    const stored = localStorage.getItem(key);
    return stored == null ? defaultOn : stored === "true";
  });
  const toggle = useCallback(() => {
    setV((prev) => {
      const next = !prev;
      localStorage.setItem(key, String(next));
      return next;
    });
  }, [key]);
  return [v, toggle] as const;
}

export function SettingsPanel() {
  const t = useTranslations("Profile.settings");
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const [notifs, toggleNotifs] = useStoredFlag("cw_notifs", true);
  const [gps, toggleGps] = useStoredFlag("cw_gps", true);
  const [emails, toggleEmails] = useStoredFlag("cw_emails", false);

  const logoutAction = logout.bind(null, locale);

  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4 animate-fade-up">
      <Toggle label={t("pushNotifs")} desc={t("pushNotifsDesc")} value={notifs} onToggle={toggleNotifs} />
      <Toggle label={t("gps")}        desc={t("gpsDesc")}        value={gps}    onToggle={toggleGps} />
      <Toggle label={t("emails")}     desc={t("emailsDesc")}     value={emails} onToggle={toggleEmails} />
      <form action={logoutAction} className="mt-4">
        <Button type="submit" variant="destructive" className="w-full">{t("logout")}</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: Build + commit**

```bash
npm run build 2>&1 | tail -10
git add messages/ src/components/profile/
git commit -m "feat(next): i18n migration for profile page (hero, xp, stats, activity, settings)"
```

---

## Task 7: Badges catalog migration

Strip display fields off `BADGES` data; move them to `messages/*.Badges.<id>.{name,desc}`. Update `BadgeGrid` and `LeaderRow` (the tooltip title removed in Task 5).

**Files:**
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json`
- Modify: `frontend-next/src/lib/data/badges.ts`
- Modify: `frontend-next/src/components/profile/BadgeGrid.tsx`
- Modify: `frontend-next/src/components/leaderboard/LeaderRow.tsx` (add tooltip back)
- Modify: `frontend-next/src/lib/api/mappers.test.ts` (drop `name`/`desc` from test fixtures)

- [ ] **Step 1: Add Badges namespace**

`messages/bg.json`:

```json
"Badges": {
  "unlocked": "{earned} / {total} ОТКЛЮЧЕНИ",
  "first_report":  { "name": "Първи сигнал",     "desc": "Докладва първото замърсяване" },
  "first_clean":   { "name": "Първо почистване", "desc": "Почисти първото замърсяване" },
  "streak_7":      { "name": "7-дневен стрийк",  "desc": "Активен 7 последователни дни" },
  "clean_10":      { "name": "10 почиствания",   "desc": "Завърши 10 успешни почиствания" },
  "verified":      { "name": "Verified User",    "desc": "Доказана активност и надеждност" },
  "eco_legend":    { "name": "Еко легенда",      "desc": "Достигни 5000 точки" },
  "district_hero": { "name": "Герой на района",  "desc": "Почисти 5 места в един район" },
  "team_player":   { "name": "Екипен играч",     "desc": "Потвърди 20 задачи на другите" }
}
```

`messages/en.json`:

```json
"Badges": {
  "unlocked": "{earned} / {total} UNLOCKED",
  "first_report":  { "name": "First report",     "desc": "Reported your first cleanup" },
  "first_clean":   { "name": "First cleanup",    "desc": "Completed your first cleanup" },
  "streak_7":      { "name": "7-day streak",     "desc": "Active 7 days in a row" },
  "clean_10":      { "name": "10 cleanups",      "desc": "Completed 10 successful cleanups" },
  "verified":      { "name": "Verified User",    "desc": "Proven activity and reliability" },
  "eco_legend":    { "name": "Eco legend",       "desc": "Reach 5000 points" },
  "district_hero": { "name": "District hero",    "desc": "Cleaned 5 sites in one district" },
  "team_player":   { "name": "Team player",      "desc": "Confirmed 20 tasks by others" }
}
```

- [ ] **Step 2: Reduce badges.ts to ID-only**

Replace `frontend-next/src/lib/data/badges.ts` with:

```ts
export interface Badge {
  id: string;
  icon: string;
  pts: number;
}

export const BADGES: Badge[] = [
  { id: "first_report",  icon: "sprout",      pts: 15 },
  { id: "first_clean",   icon: "paintbrush",  pts: 40 },
  { id: "streak_7",      icon: "flame",       pts: 100 },
  { id: "clean_10",      icon: "zap",         pts: 200 },
  { id: "verified",      icon: "badge-check", pts: 500 },
  { id: "eco_legend",    icon: "globe",       pts: 1000 },
  { id: "district_hero", icon: "building",    pts: 300 },
  { id: "team_player",   icon: "users",       pts: 250 },
];
```

- [ ] **Step 3: Migrate BadgeGrid**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { BADGES } from "@/lib/data/badges";
import { deriveBadges } from "@/lib/api/mappers";
import type { User } from "@/lib/api/mappers";

export function BadgeGrid({ user }: { user: User }) {
  const t = useTranslations("Badges");
  const earned = new Set(deriveBadges(user).map((b) => b.id));
  return (
    <div className="animate-fade-up">
      <div className="text-text-3 text-xs uppercase tracking-wider mb-3">
        {t("unlocked", { earned: earned.size, total: BADGES.length })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BADGES.map((b) => {
          const got = earned.has(b.id);
          return (
            <div
              key={b.id}
              title={t(`${b.id}.desc` as `${string}.desc`)}
              className={`relative rounded-xl border p-3 flex flex-col items-center gap-1 transition ${
                got ? "border-accent-pink-border bg-accent-pink-dim" : "border-brand-border bg-bg-card opacity-50"
              }`}
            >
              <div className="text-2xl">★</div>
              <div className={got ? "text-text-1 text-xs text-center" : "text-text-3 text-xs text-center"}>
                {t(`${b.id}.name` as `${string}.name`)}
              </div>
              {got && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-pink" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add tooltip back in LeaderRow**

In the badge-stars block in `frontend-next/src/components/leaderboard/LeaderRow.tsx` (the one rendered when `sortBy === "awards"`), add `useTranslations("Badges")` and pass the translated name as `title`:

```tsx
// add near other hooks at top of LeaderRow:
const tBadges = useTranslations("Badges");

// then in the JSX:
{user.earnedBadges.slice(0, 3).map((b) => (
  <span key={b.id} title={tBadges(`${b.id}.name` as `${string}.name`)}>★</span>
))}
```

- [ ] **Step 5: Update mapper test fixtures**

The current `mapLeaderboardUser` test relies on `deriveBadges` returning a `Badge[]` — the `Badge` type now lacks `name` and `desc`. The existing test does not reference those fields, so no change is required. Run:

```bash
npm test 2>&1 | tail -6   # expect: 55 passing
```

If a TypeScript build error appears about a missing `name`/`desc`, it's coming from an unmigrated consumer — find and fix it.

- [ ] **Step 6: Build + commit**

```bash
npm run build 2>&1 | tail -10   # expect green
git add messages/ src/lib/data/badges.ts src/components/profile/BadgeGrid.tsx src/components/leaderboard/LeaderRow.tsx
git commit -m "feat(next): move badge display strings to messages catalog"
```

---

## Task 8: Rewards extraction + catalog migration

Same pattern as badges: reduce `REWARDS` to ID-only data and move display strings (`name`, `desc`, `partner`) into a `RewardCatalog` namespace. Plus extract all Rewards UI chrome.

**Files:**
- Modify: `frontend-next/messages/bg.json` + `frontend-next/messages/en.json`
- Modify: `frontend-next/src/lib/data/rewards.ts`
- Modify: `frontend-next/src/components/rewards/RewardsClient.tsx`
- Modify: `frontend-next/src/components/rewards/RewardsHero.tsx`
- Modify: `frontend-next/src/components/rewards/RewardCard.tsx`
- Modify: `frontend-next/src/components/rewards/ClaimConfirm.tsx`
- Modify: `frontend-next/src/components/rewards/HistoryList.tsx`

- [ ] **Step 1: Add Rewards + RewardCatalog namespaces**

`messages/bg.json`:

```json
"Rewards": {
  "title": "НАГРАДИ",
  "hero": {
    "balanceLabel": "НАЛИЧНИ ТОЧКИ",
    "chistPoints": "CHIST POINTS",
    "cleanings": "ПОЧИСТВАНИЯ",
    "reports": "СИГНАЛИ",
    "streak": "СТРИЙК"
  },
  "tabs": {
    "shop": "МАГАЗИН",
    "history": "ИСТОРИЯ"
  },
  "categories": {
    "all": "ВСИЧКИ",
    "food": "ХРАНА",
    "eco": "ЕКО",
    "transport": "ТРАНСПОРТ",
    "experience": "ПРЕЖИВЯВАНЕ",
    "status": "СТАТУС"
  },
  "card": {
    "taken": "ВЗЕТО",
    "moreNeeded": "Още {n} точки",
    "hot": "HOT",
    "new": "NEW"
  },
  "claim": {
    "confirmTitle": "Потвърди награда",
    "partner": "Партньор: {name}",
    "points": "{n} точки",
    "cancel": "Отказ",
    "confirm": "Вземи",
    "success": "{name} — взето успешно!"
  },
  "history": {
    "empty": "Няма история"
  }
},
"RewardCatalog": {
  "1": { "name": "Безплатно кафе",        "desc": "Една безплатна напитка в партньорски кафенета в София.",   "partner": "COSTA COFFEE · STARBUCKS" },
  "2": { "name": "Засади дърво",          "desc": "Организираме засаждане на дърво в твое име в парк в София.", "partner": "SOFIA GREEN INITIATIVE" },
  "3": { "name": "Безплатен транспорт",   "desc": "Карта за градски транспорт за 1 месец.",                    "partner": "ЦЕНТЪРА ЗА ГРАДСКА МОБИЛНОСТ" },
  "4": { "name": "Отстъпка 20% храна",    "desc": "20% намаление в партньорски ресторанти.",                   "partner": "HAPPY · HAPPY BAR & GRILL" },
  "5": { "name": "Еко продуктов пакет",   "desc": "Комплект от биоразградими продукти от SofiaEco.",           "partner": "SOFIAECO STORE" },
  "6": { "name": "Verified User статус",  "desc": "Получи официалния VRF badge и 2x точки за всяка задача.",   "partner": "CHIST PLATFORM" },
  "7": { "name": "Концерт / Събитие",     "desc": "2 безплатни билета за партньорско събитие в София.",        "partner": "SOFIA LIVE" },
  "8": { "name": "Почистващ комплект",    "desc": "Професионален еко комплект за почистване.",                 "partner": "ECO TOOLS BG" }
}
```

`messages/en.json`:

```json
"Rewards": {
  "title": "REWARDS",
  "hero": {
    "balanceLabel": "AVAILABLE POINTS",
    "chistPoints": "CHIST POINTS",
    "cleanings": "CLEANINGS",
    "reports": "REPORTS",
    "streak": "STREAK"
  },
  "tabs": {
    "shop": "SHOP",
    "history": "HISTORY"
  },
  "categories": {
    "all": "ALL",
    "food": "FOOD",
    "eco": "ECO",
    "transport": "TRANSPORT",
    "experience": "EXPERIENCE",
    "status": "STATUS"
  },
  "card": {
    "taken": "TAKEN",
    "moreNeeded": "{n} more points",
    "hot": "HOT",
    "new": "NEW"
  },
  "claim": {
    "confirmTitle": "Confirm reward",
    "partner": "Partner: {name}",
    "points": "{n} points",
    "cancel": "Cancel",
    "confirm": "Claim",
    "success": "{name} — claimed!"
  },
  "history": {
    "empty": "No history yet"
  }
},
"RewardCatalog": {
  "1": { "name": "Free coffee",          "desc": "One free drink at partner cafes in Sofia.",                   "partner": "COSTA COFFEE · STARBUCKS" },
  "2": { "name": "Plant a tree",         "desc": "We plant a tree in your name in a Sofia park.",              "partner": "SOFIA GREEN INITIATIVE" },
  "3": { "name": "Free transit",         "desc": "1-month city transit pass.",                                 "partner": "SOFIA URBAN MOBILITY CENTER" },
  "4": { "name": "20% off meal",         "desc": "20% off at partner restaurants.",                            "partner": "HAPPY · HAPPY BAR & GRILL" },
  "5": { "name": "Eco product pack",     "desc": "Set of biodegradable products from SofiaEco.",               "partner": "SOFIAECO STORE" },
  "6": { "name": "Verified User status", "desc": "Official VRF badge and 2x points per task.",                 "partner": "CHIST PLATFORM" },
  "7": { "name": "Concert / Event",      "desc": "2 free tickets to a partner event in Sofia.",                "partner": "SOFIA LIVE" },
  "8": { "name": "Cleanup kit",          "desc": "Professional eco cleanup kit.",                              "partner": "ECO TOOLS BG" }
}
```

- [ ] **Step 2: Reduce rewards.ts**

```ts
export interface Reward {
  id: number;
  icon: string;
  cost: number;
  category: "food" | "eco" | "transport" | "experience" | "status";
  featured?: boolean;
  hot?: boolean;
  newBadge?: boolean;
}

export const REWARDS: Reward[] = [
  { id: 1, icon: "coffee",    cost: 500,  category: "food",       featured: true, hot: true },
  { id: 2, icon: "tree-pine", cost: 800,  category: "eco" },
  { id: 3, icon: "ticket",    cost: 1200, category: "transport",  newBadge: true },
  { id: 4, icon: "utensils",  cost: 350,  category: "food" },
  { id: 5, icon: "recycle",   cost: 600,  category: "eco" },
  { id: 6, icon: "medal",     cost: 3000, category: "status" },
  { id: 7, icon: "ticket",    cost: 2000, category: "experience", newBadge: true },
  { id: 8, icon: "droplets",  cost: 400,  category: "eco" },
];

export const CATEGORIES = ["all", "food", "eco", "transport", "experience", "status"] as const;
export type Category = (typeof CATEGORIES)[number];
```

- [ ] **Step 3: Migrate RewardsHero**

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { User } from "@/lib/api/mappers";

export function RewardsHero({ user }: { user: User }) {
  const t = useTranslations("Rewards.hero");
  return (
    <div className="relative rounded-2xl border border-accent-pink-border bg-accent-pink-dim p-6 flex flex-col items-center gap-2 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, var(--color-accent-pink-glow), transparent 70%)" }} />
      <div className="relative text-text-2 text-xs uppercase tracking-wider">{t("balanceLabel")}</div>
      <div className="relative text-text-1 text-4xl">{user.points.toLocaleString()}</div>
      <div className="relative text-text-3 text-xs uppercase tracking-wider">{t("chistPoints")}</div>
      <div className="relative grid grid-cols-3 gap-4 w-full pt-3 mt-2 border-t border-accent-pink-border/40">
        {[
          { val: user.cleanings, key: t("cleanings") },
          { val: user.reports,   key: t("reports") },
          { val: user.streak,    key: t("streak") },
        ].map((s) => (
          <div key={s.key} className="flex flex-col items-center">
            <div className="text-text-1 text-lg">{s.val}</div>
            <div className="text-text-3 text-[0.625rem] uppercase tracking-wider">{s.key}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Migrate RewardCard**

```tsx
"use client";

import { Star, Lock, Flame, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Reward } from "@/lib/data/rewards";

interface Props {
  reward: Reward;
  userPoints: number;
  claimed: boolean;
  onClaim: (r: Reward) => void;
}

export function RewardCard({ reward, userPoints, claimed, onClaim }: Props) {
  const tCard = useTranslations("Rewards.card");
  const tCat = useTranslations("RewardCatalog");

  const canAfford = userPoints >= reward.cost;
  const isLocked = !canAfford && !claimed;
  const progress = Math.min((userPoints / reward.cost) * 100, 100);
  const needMore = reward.cost - userPoints;
  const idKey = String(reward.id);

  return (
    <div
      onClick={() => !isLocked && !claimed && onClaim(reward)}
      className={`relative rounded-xl border p-4 flex flex-col gap-2 transition cursor-pointer ${
        claimed ? "border-brand-border bg-bg-card opacity-60" :
        isLocked ? "border-brand-border bg-bg-card opacity-70 cursor-not-allowed" :
        "border-brand-border bg-bg-card hover:bg-bg-card-hover hover:border-accent-pink-border"
      } ${reward.featured ? "border-accent-pink-border bg-accent-pink-dim" : ""}`}
    >
      {reward.hot && (
        <span className="absolute top-2 right-2 text-[0.625rem] uppercase tracking-wider text-status-red flex items-center gap-1">
          <Flame size={10} strokeWidth={2} /> {tCard("hot")}
        </span>
      )}
      {reward.newBadge && (
        <span className="absolute top-2 right-2 text-[0.625rem] uppercase tracking-wider text-accent-pink flex items-center gap-1">
          <Sparkles size={10} strokeWidth={2} /> {tCard("new")}
        </span>
      )}
      <div className="text-2xl">★</div>
      <div className="text-text-1 text-sm">{tCat(`${idKey}.name` as `${string}.name`)}</div>
      <div className="text-text-3 text-xs leading-snug">{tCat(`${idKey}.desc` as `${string}.desc`)}</div>
      <div className="text-text-3 text-[0.625rem] uppercase tracking-wider">{tCat(`${idKey}.partner` as `${string}.partner`)}</div>
      {isLocked && (
        <div>
          <div className="h-1 rounded-full bg-brand-primary-dim overflow-hidden">
            <div className="h-full bg-text-2" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-text-3 text-[0.625rem] uppercase tracking-wider mt-1">
            {tCard("moreNeeded", { n: needMore.toLocaleString() })}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className={`flex items-center gap-1 text-sm ${isLocked ? "text-text-3" : "text-text-1"}`}>
          <Star size={12} strokeWidth={2} /> {reward.cost.toLocaleString()}
        </span>
        {claimed && <span className="text-text-3 text-[0.625rem] uppercase tracking-wider">{tCard("taken")}</span>}
        {isLocked && <Lock size={14} strokeWidth={2} className="text-text-3" />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Migrate ClaimConfirm**

```tsx
"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Reward } from "@/lib/data/rewards";

interface Props {
  reward: Reward | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClaimConfirm({ reward, onConfirm, onCancel }: Props) {
  const tClaim = useTranslations("Rewards.claim");
  const tCat = useTranslations("RewardCatalog");
  const idKey = reward ? String(reward.id) : "";

  return (
    <Dialog open={reward != null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        {reward && (
          <>
            <DialogHeader>
              <DialogTitle>{tClaim("confirmTitle")}</DialogTitle>
            </DialogHeader>
            <div className="text-2xl">★</div>
            <div className="text-text-1 text-sm">
              <strong>{tCat(`${idKey}.name` as `${string}.name`)}</strong>
              <p className="mt-1 text-text-2">{tCat(`${idKey}.desc` as `${string}.desc`)}</p>
              <p className="mt-2 text-text-3 text-xs">
                {tClaim("partner", { name: tCat(`${idKey}.partner` as `${string}.partner`) })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-text-1">
              <Star size={14} strokeWidth={2} /> {tClaim("points", { n: reward.cost.toLocaleString() })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onCancel}>{tClaim("cancel")}</Button>
              <Button onClick={onConfirm}>{tClaim("confirm")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Migrate HistoryList**

```tsx
"use client";

import { useTranslations } from "next-intl";

export interface HistoryItem {
  id: number;
  icon: string;
  name: string;     // resolved name at claim-time, persisted to localStorage so it survives lang switch
  date: string;
  pts: number;
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const t = useTranslations("Rewards.history");
  if (items.length === 0) {
    return (
      <div className="text-center text-text-3 text-xs uppercase tracking-wider py-6">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((h) => (
        <div
          key={h.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-brand-border bg-bg-card animate-fade-up"
        >
          <div className="w-9 h-9 grid place-items-center rounded-md border border-brand-border bg-brand-primary-dim">★</div>
          <div className="flex-1 min-w-0">
            <div className="text-text-1 text-sm">{h.name}</div>
            <div className="text-text-3 text-xs">{h.date}</div>
          </div>
          <div className={h.pts > 0 ? "text-text-1" : "text-status-red"}>
            {h.pts > 0 ? "+" : ""}{h.pts}
          </div>
        </div>
      ))}
    </div>
  );
}
```

(History items keep their localized `name` snapshot — switching language later won't retranslate already-claimed rows. This matches the old app behavior and is acceptable.)

- [ ] **Step 7: Migrate RewardsClient**

In `frontend-next/src/components/rewards/RewardsClient.tsx`:

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@/lib/api/mappers";
import { REWARDS, CATEGORIES, type Reward, type Category } from "@/lib/data/rewards";
import { useApp } from "@/context/AppContext";
import { RewardsHero } from "./RewardsHero";
import { RewardCard } from "./RewardCard";
import { ClaimConfirm } from "./ClaimConfirm";
import { HistoryList, type HistoryItem } from "./HistoryList";

const HISTORY_KEY = "cw_reward_history";

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export function RewardsClient({ user }: { user: User }) {
  const t = useTranslations("Rewards");
  const tCat = useTranslations("RewardCatalog");
  const tClaim = useTranslations("Rewards.claim");
  const { pushNotification } = useApp();

  const [cat, setCat] = useState<Category>("all");
  const [tab, setTab] = useState<"shop" | "history">("shop");
  const [pending, setPending] = useState<Reward | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [claimed, setClaimed] = useState<Set<number>>(new Set());

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const filtered = useMemo(() => REWARDS.filter((r) => cat === "all" || r.category === cat), [cat]);
  const featured = filtered.find((r) => r.featured);
  const rest = filtered.filter((r) => !r.featured);

  const handleClaim = (reward: Reward) => {
    if (user.points < reward.cost || claimed.has(reward.id)) return;
    setPending(reward);
  };

  const confirmClaim = () => {
    if (!pending) return;
    const name = tCat(`${pending.id}.name` as `${string}.name`);
    pushNotification({ type: "success", message: tClaim("success", { name }), duration: 4000 });
    setClaimed((s) => new Set([...s, pending.id]));
    const now = new Date();
    const item: HistoryItem = {
      id: Date.now(),
      icon: pending.icon,
      name,
      date: now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
      pts: -pending.cost,
    };
    const updated = [item, ...history];
    setHistory(updated);
    saveHistory(updated);
    setPending(null);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <h1 className="text-text-1 text-xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>{t("title")}</h1>

      <RewardsHero user={user} />

      <div className="flex bg-bg-card rounded-md p-1 gap-1">
        {[{ id: "shop" as const, label: t("tabs.shop") }, { id: "history" as const, label: t("tabs.history") }].map((tt) => (
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

      {tab === "shop" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2.5 py-1 rounded-md text-[0.625rem] uppercase tracking-wider transition ${
                  cat === c ? "bg-accent-pink text-bg-base" : "bg-brand-primary-dim text-text-2 hover:text-text-1"
                }`}
              >
                {t(`categories.${c}`)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured && (
              <div className="sm:col-span-2">
                <RewardCard reward={featured} userPoints={user.points} claimed={claimed.has(featured.id)} onClaim={handleClaim} />
              </div>
            )}
            {rest.map((r) => (
              <RewardCard key={r.id} reward={r} userPoints={user.points} claimed={claimed.has(r.id)} onClaim={handleClaim} />
            ))}
          </div>
        </>
      )}

      {tab === "history" && <HistoryList items={history} />}

      <ClaimConfirm reward={pending} onConfirm={confirmClaim} onCancel={() => setPending(null)} />
    </main>
  );
}
```

- [ ] **Step 8: Build + commit**

```bash
npm run build 2>&1 | tail -10
git add messages/ src/lib/data/rewards.ts src/components/rewards/
git commit -m "feat(next): i18n migration for rewards (catalog + UI chrome)"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Tests + build**

```bash
npm test 2>&1 | tail -6     # expect 55 passing
npm run build 2>&1 | tail -10
```

- [ ] **Step 2: No-Cyrillic check on src/**

```bash
grep -rln '[А-Яа-я]' src/ --include="*.tsx" --include="*.ts" | grep -v "lib/mock\|mappers.test"
```

Expected: empty output. (The mock data file and mapper tests can keep Cyrillic — they're internal fixtures, not UI.)

- [ ] **Step 3: Verify both locales render via curl**

```bash
npm run dev &
DEV_PID=$!
sleep 4

# Authenticate with mock creds
curl -sS -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@chist.bg","password":"test1234"}' \
  -c /tmp/cw_cookies.txt > /dev/null

for locale in bg en; do
  for path in leaderboard profile rewards reports; do
    code=$(curl -sS -o /tmp/p_${locale}_${path}.html -w "%{http_code}" -b /tmp/cw_cookies.txt "http://localhost:3000/$locale/$path")
    echo "$locale/$path → HTTP $code, $(wc -c < /tmp/p_${locale}_${path}.html)B"
  done
done

# Quick content spot-check
echo "=== BG leaderboard heading? ==="
grep -o "КЛАСАЦИЯ" /tmp/p_bg_leaderboard.html | head -1
echo "=== EN leaderboard heading? ==="
grep -o "LEADERBOARD" /tmp/p_en_leaderboard.html | head -1
echo "=== BG rewards categories? ==="
grep -o "ВСИЧКИ\|ХРАНА" /tmp/p_bg_rewards.html | sort -u
echo "=== EN rewards categories? ==="
grep -o "ALL\|FOOD" /tmp/p_en_rewards.html | sort -u

kill $DEV_PID
```

Expected: all 8 requests return HTTP 200; each grep finds the expected localized string.

- [ ] **Step 4: Tag**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git tag -a nextjs-phase-6-complete -m "Phase 6 (i18n migration) complete: every UI string moved to next-intl catalogs; locale switcher in Navbar; both /bg/* and /en/* render fully."
```

---

## Phase 6 Definition of Done

- 55 vitest tests still pass.
- Production build green.
- No Cyrillic remains in `src/components/` or `src/app/` (only in `src/lib/mock/` fixtures and mapper tests).
- LocaleSwitcher in Navbar swaps between `/bg/*` and `/en/*` correctly.
- Each of `/{bg,en}/{reports,leaderboard,profile,rewards}` returns HTTP 200 with locale-appropriate content.

## What's NOT in Phase 6

- **Phase 7:** Helm cutover, delete `frontend/` (Vite), update README + docker-compose, staging soak, merge to main.
- Backend i18n: server-rendered error messages from Spring Boot still come back in whatever language the backend speaks. Out of scope here.
- Translating mock fixture text in `src/lib/mock/data.ts` — that's internal seed data for the mock backend; the live backend will speak its own languages.
