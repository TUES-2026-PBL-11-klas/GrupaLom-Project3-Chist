# Next.js Rewrite — Phase 5: Leaderboard, Profile, Rewards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the remaining three protected pages — Leaderboard, Profile, Rewards — to the Next.js App Router. By the end of Phase 5 the mock walkthrough lets you log in, click LEADERBOARD/PROFILE/REWARDS in the Navbar, and see fully-styled pages with podium, stat tabs, badge grid, settings toggles, reward catalog, claim modal, and history list — all wired against mock data.

**Architecture:** Server components do the reads (`usersApi.getLeaderboard()`, `usersApi.getMe()`) and pass typed props into client components that own all interactivity (sort tabs, profile tabs, category filter, claim modal). Badges are derived client-side from the user shape (the backend has no badges endpoint and the old app derived them the same way). Toast notifications get wired in via `sonner`, replacing the unused `AppContext.pushNotification` plumbing from Phase 4. Rewards "claim" is local-only (toast + localStorage history) — no backend endpoint exists yet; that gets wired when the backend ships a rewards API.

**Tech Stack:** Next.js 16 App Router, shadcn primitives (existing + `sonner`, `dialog`, `switch`), lucide-react, vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` §5
**Prior plan:** `docs/superpowers/plans/2026-05-21-nextjs-rewrite-phase-4-reports.md`
**Source of truth for ports:** `frontend/src/pages/{LeaderboardView,ProfileView,RewardsView}.tsx`, `frontend/src/data/constants.ts`.

---

## File Structure

```
frontend-next/src/
├── lib/api/
│   ├── mappers.ts                       # MODIFIED: + LeaderboardUser type, mapLeaderboardUser, deriveBadges
│   └── mappers.test.ts                  # MODIFIED: + tests for mapLeaderboardUser + deriveBadges
├── lib/data/
│   ├── badges.ts                        # NEW: BADGES catalog (port of frontend/src/data/constants.ts)
│   └── rewards.ts                       # NEW: REWARDS catalog (port)
├── components/ui/
│   ├── sonner.tsx                       # NEW: shadcn add
│   ├── dialog.tsx                       # NEW: shadcn add
│   └── switch.tsx                       # NEW: shadcn add
├── components/leaderboard/
│   ├── LeaderboardClient.tsx            # NEW: sort tabs + podium + rows + my-rank pill
│   ├── Podium.tsx                       # NEW: top-3 with <3-entry guard
│   └── LeaderRow.tsx                    # NEW: single row
├── components/profile/
│   ├── ProfileClient.tsx                # NEW: orchestrates hero + tabs + tab content
│   ├── ProfileHero.tsx                  # NEW: avatar + name + level chip
│   ├── XpBar.tsx                        # NEW: progress to next level
│   ├── StatCards.tsx                    # NEW: 3 top tiles
│   ├── StatBars.tsx                     # NEW: stats-tab content
│   ├── BadgeGrid.tsx                    # NEW: badges-tab content
│   ├── ActivityChart.tsx                # NEW: static 4-week chart
│   └── SettingsPanel.tsx                # NEW: toggles + logout
├── components/rewards/
│   ├── RewardsClient.tsx                # NEW: hero balance + shop/history tabs + cat filter
│   ├── RewardsHero.tsx                  # NEW: balance card + quick stats
│   ├── RewardCard.tsx                   # NEW: catalog tile
│   ├── ClaimConfirm.tsx                 # NEW: shadcn-Dialog confirm modal
│   └── HistoryList.tsx                  # NEW: history-tab content
├── components/toasts/
│   └── NotificationBridge.tsx           # NEW: client subscriber that pipes AppContext.notifications → sonner toasts
└── app/[locale]/(app)/
    ├── layout.tsx                       # MODIFIED: render <Toaster /> + <NotificationBridge />
    ├── leaderboard/page.tsx             # NEW: server fetch + LeaderboardClient
    ├── profile/page.tsx                 # NEW: server fetch + ProfileClient
    └── rewards/page.tsx                 # NEW: server fetch + RewardsClient
```

---

## Task 1: Sonner Toaster + NotificationBridge

The `AppContext.pushNotification` API has been plumbed since Phase 4 but never rendered anywhere. Phase 5 wires it to `sonner` so any client component can call `pushNotification({ type, message })` and get a toast.

**Files:**
- Add shadcn primitive: `sonner`
- Create: `frontend-next/src/components/toasts/NotificationBridge.tsx`
- Modify: `frontend-next/src/app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: Install sonner**

```bash
cd frontend-next && npx shadcn@latest add sonner
```

Expected output mentions `Created 1 file: src/components/ui/sonner.tsx`. (If it also says "Installed packages: sonner, next-themes", that's fine — those are sonner's runtime deps.)

- [ ] **Step 2: Write the bridge**

`frontend-next/src/components/toasts/NotificationBridge.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";

export function NotificationBridge() {
  const { notifications, dismissNotification } = useApp();
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      const fn = n.type === "error" ? toast.error : n.type === "success" ? toast.success : toast;
      fn(n.message, { duration: n.duration ?? 4000, onAutoClose: () => dismissNotification(n.id) });
    }
  }, [notifications, dismissNotification]);

  return null;
}
```

- [ ] **Step 3: Mount Toaster + Bridge in (app) layout**

Open `frontend-next/src/app/[locale]/(app)/layout.tsx`. Add inside the `<AppProvider>` tree:

```tsx
import { Toaster } from "@/components/ui/sonner";
import { NotificationBridge } from "@/components/toasts/NotificationBridge";

// inside the JSX returned by the layout, after <Navbar /> and {children}:
<Toaster theme="dark" position="top-right" richColors />
<NotificationBridge />
```

(Exact placement: `Toaster` and `NotificationBridge` should be siblings of `{children}` inside `<AppProvider>` so they re-render on context changes.)

- [ ] **Step 4: Build + commit**

```bash
npm run build   # expect: green
git add src/components/toasts src/components/ui/sonner.tsx src/app/\[locale\]/\(app\)/layout.tsx package.json package-lock.json
git commit -m "feat(next): pipe AppContext notifications into sonner toasts"
```

---

## Task 2: Badge catalog + mapper extensions (TDD)

The leaderboard and profile pages both need a list of *earned* badges per user. Port the `BADGES` catalog from the old app, add a typed `deriveBadges(user)` function, and add a `mapLeaderboardUser` mapper that augments a `User` with rank + earned-badge metadata.

**Files:**
- Create: `frontend-next/src/lib/data/badges.ts`
- Modify: `frontend-next/src/lib/api/mappers.ts`
- Modify: `frontend-next/src/lib/api/mappers.test.ts`

- [ ] **Step 1: Write the badge catalog**

`frontend-next/src/lib/data/badges.ts`:

```ts
export interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
  pts: number;
}

export const BADGES: Badge[] = [
  { id: "first_report",  icon: "sprout",      name: "Първи сигнал",     desc: "Докладва първото замърсяване",   pts: 15 },
  { id: "first_clean",   icon: "paintbrush",  name: "Първо почистване", desc: "Почисти първото замърсяване",    pts: 40 },
  { id: "streak_7",      icon: "flame",       name: "7-дневен стрийк",  desc: "Активен 7 последователни дни",   pts: 100 },
  { id: "clean_10",      icon: "zap",         name: "10 почиствания",   desc: "Завърши 10 успешни почиствания", pts: 200 },
  { id: "verified",      icon: "badge-check", name: "Verified User",    desc: "Доказана активност и надеждност", pts: 500 },
  { id: "eco_legend",    icon: "globe",       name: "Еко легенда",      desc: "Достигни 5000 точки",            pts: 1000 },
  { id: "district_hero", icon: "building",    name: "Герой на района",  desc: "Почисти 5 места в един район",   pts: 300 },
  { id: "team_player",   icon: "users",       name: "Екипен играч",     desc: "Потвърди 20 задачи на другите",  pts: 250 },
];
```

- [ ] **Step 2: Write failing tests in mappers.test.ts**

Add to `frontend-next/src/lib/api/mappers.test.ts`:

```ts
import { mapLeaderboardUser, deriveBadges } from "./mappers";

describe("deriveBadges", () => {
  it("awards first_report + first_clean when cleanings > 0", () => {
    const u = { points: 0, streak: 0, cleanings: 1, verified: false };
    const ids = deriveBadges(u).map((b) => b.id);
    expect(ids).toContain("first_report");
    expect(ids).toContain("first_clean");
  });

  it("awards streak_7 at streak >= 7 and clean_10 at cleanings >= 10", () => {
    const ids = deriveBadges({ points: 0, streak: 7, cleanings: 10, verified: false }).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["streak_7", "clean_10"]));
  });

  it("awards verified when user.verified is true", () => {
    expect(deriveBadges({ points: 0, streak: 0, cleanings: 0, verified: true }).map((b) => b.id)).toContain("verified");
  });

  it("awards eco_legend at 5000+ points", () => {
    expect(deriveBadges({ points: 5000, streak: 0, cleanings: 0, verified: false }).map((b) => b.id)).toContain("eco_legend");
  });

  it("awards district_hero at cleanings >= 5 and team_player at cleanings >= 20", () => {
    const ids = deriveBadges({ points: 0, streak: 0, cleanings: 20, verified: false }).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["district_hero", "team_player"]));
  });

  it("awards nothing for a brand-new user", () => {
    expect(deriveBadges({ points: 0, streak: 0, cleanings: 0, verified: false })).toHaveLength(0);
  });
});

describe("mapLeaderboardUser", () => {
  it("adds rank, awards, earnedBadges to a User", () => {
    const raw = { id: "u1", username: "Maria", points: 5420, streak: 18, role: "VerifiedUser", cleanings: 27, reports: 41, createdAt: "2024-11-03T08:00:00Z" };
    const lb = mapLeaderboardUser(raw, 1);
    expect(lb.rank).toBe(1);
    expect(lb.name).toBe("Maria");
    expect(lb.verified).toBe(true);
    expect(lb.earnedBadges.length).toBeGreaterThan(0);
    expect(lb.awards).toBe(lb.earnedBadges.length);
  });
});
```

- [ ] **Step 3: Confirm fail**

```bash
npm test 2>&1 | grep -E "FAIL|deriveBadges|mapLeaderboardUser" | head -10
```

Expected: failures naming `deriveBadges` and `mapLeaderboardUser` (not exported).

- [ ] **Step 4: Implement in mappers.ts**

Append to `frontend-next/src/lib/api/mappers.ts`:

```ts
import { BADGES, type Badge } from "@/lib/data/badges";

export interface LeaderboardUser extends User {
  rank: number;
  awards: number;
  earnedBadges: Badge[];
}

interface DerivableUser {
  points: number;
  streak: number;
  cleanings: number;
  verified: boolean;
}

export function deriveBadges(u: DerivableUser): Badge[] {
  return BADGES.filter((b) => {
    if (b.id === "first_report" && u.cleanings > 0) return true;
    if (b.id === "first_clean" && u.cleanings > 0) return true;
    if (b.id === "streak_7" && u.streak >= 7) return true;
    if (b.id === "clean_10" && u.cleanings >= 10) return true;
    if (b.id === "verified" && u.verified) return true;
    if (b.id === "eco_legend" && u.points >= 5000) return true;
    if (b.id === "district_hero" && u.cleanings >= 5) return true;
    if (b.id === "team_player" && u.cleanings >= 20) return true;
    return false;
  });
}

export function mapLeaderboardUser(data: Record<string, unknown>, rank: number): LeaderboardUser {
  const user = mapApiUser(data);
  const earned = deriveBadges(user);
  return { ...user, rank, awards: earned.length, earnedBadges: earned };
}
```

- [ ] **Step 5: Pass + commit**

```bash
npm test 2>&1 | tail -6   # expect: 55 passing (48 baseline + 7 new)
git add src/lib/data/badges.ts src/lib/api/mappers.ts src/lib/api/mappers.test.ts
git commit -m "feat(next): port BADGES catalog + deriveBadges + mapLeaderboardUser"
```

---

## Task 3: Podium + LeaderRow

**Files:**
- Create: `frontend-next/src/components/leaderboard/Podium.tsx`
- Create: `frontend-next/src/components/leaderboard/LeaderRow.tsx`

- [ ] **Step 1: Podium**

`frontend-next/src/components/leaderboard/Podium.tsx`:

```tsx
"use client";

import { Crown, Trophy } from "lucide-react";
import type { LeaderboardUser } from "@/lib/api/mappers";

const RANK_COLORS = ["#ffffff", "#aaaaaa", "#777777"];

export function Podium({ top3 }: { top3: LeaderboardUser[] }) {
  if (top3.length < 3) return null;                       // <3 entries guard, per spec §5
  const order = [top3[1], top3[0], top3[2]];              // visual order: 2nd, 1st, 3rd
  const heights = [90, 124, 76];
  const sizes = [18, 24, 16];
  const positions = [2, 1, 3];

  return (
    <div className="flex items-end justify-center gap-4 py-4">
      {order.map((user, i) => (
        <div key={user.id} className="flex flex-col items-center gap-2">
          {positions[i] === 1 && (
            <div className="text-text-1 animate-float"><Crown size={20} strokeWidth={1.8} /></div>
          )}
          <div className="text-text-1 font-medium" style={{ fontSize: sizes[i] }}>{user.avatar}</div>
          <div className={positions[i] === 1 ? "text-text-1" : "text-text-2"} style={{ fontSize: 12, letterSpacing: 1 }}>
            {user.name}
          </div>
          <div
            className="flex flex-col items-center justify-end gap-1 rounded-md"
            style={{
              width: positions[i] === 1 ? 84 : 70,
              height: heights[i],
              background: `rgba(255,255,255,${positions[i] === 1 ? 0.07 : 0.03})`,
              border: `1px solid rgba(255,255,255,${positions[i] === 1 ? 0.2 : 0.1})`,
            }}
          >
            <div style={{ color: RANK_COLORS[i], fontSize: sizes[i] - 2 }}>#{positions[i]}</div>
            <div className="flex items-center gap-1 text-text-3 text-xs">
              {user.awards} <Trophy size={12} strokeWidth={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: LeaderRow**

`frontend-next/src/components/leaderboard/LeaderRow.tsx`:

```tsx
"use client";

import { Check, Flame, Paintbrush, Trophy } from "lucide-react";
import type { LeaderboardUser } from "@/lib/api/mappers";

const RANK_COLORS = ["#ffffff", "#aaaaaa", "#777777"];

export type SortBy = "awards" | "cleanings" | "points";

export function LeaderRow({ user, isMe, index, sortBy }: { user: LeaderboardUser; isMe: boolean; index: number; sortBy: SortBy }) {
  const rankColor = index < 3 ? RANK_COLORS[index] : undefined;

  const value =
    sortBy === "awards" ? user.awards :
    sortBy === "cleanings" ? user.cleanings :
    user.points;

  const label =
    sortBy === "awards" ? "AWARDS" :
    sortBy === "cleanings" ? "CLEANINGS" :
    "POINTS";

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
          {isMe && <span className="px-1.5 py-0.5 rounded text-[0.625rem] uppercase tracking-wider bg-accent-pink-dim text-accent-pink">YOU</span>}
        </div>
        <div className="flex items-center gap-2 text-text-3 text-xs mt-0.5">
          <span>{user.level}</span>
          {user.streak > 0 && <span>· <Flame size={10} strokeWidth={2} className="inline" /> {user.streak}</span>}
          <span>· <Paintbrush size={10} strokeWidth={2} className="inline" /> {user.cleanings}</span>
        </div>
        {sortBy === "awards" && user.earnedBadges.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-text-3 text-xs">
            {user.earnedBadges.slice(0, 3).map((b) => (
              <span key={b.id} title={b.name}>★</span>
            ))}
            {user.earnedBadges.length > 3 && <span className="text-text-3">+{user.earnedBadges.length - 3}</span>}
          </div>
        )}
      </div>

      <div className="text-right">
        <div className="text-text-1 text-base" style={{ color: rankColor }}>{value.toLocaleString()}</div>
        <div className="text-text-3 text-[0.625rem] uppercase tracking-wider flex items-center gap-1 justify-end">
          {label === "AWARDS" && <Trophy size={10} strokeWidth={2} />} {label}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard/
git commit -m "feat(next): Podium + LeaderRow components for leaderboard"
```

---

## Task 4: LeaderboardClient + page

**Files:**
- Create: `frontend-next/src/components/leaderboard/LeaderboardClient.tsx`
- Create: `frontend-next/src/app/[locale]/(app)/leaderboard/page.tsx`

- [ ] **Step 1: LeaderboardClient**

`frontend-next/src/components/leaderboard/LeaderboardClient.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import type { LeaderboardUser, User } from "@/lib/api/mappers";
import { Podium } from "./Podium";
import { LeaderRow, type SortBy } from "./LeaderRow";

const TABS: { id: SortBy; label: string }[] = [
  { id: "awards",     label: "НАГРАДИ" },
  { id: "cleanings",  label: "ПОЧИСТВАНИЯ" },
  { id: "points",     label: "ТОЧКИ" },
];

interface Props {
  users: LeaderboardUser[];
  me: User;
}

export function LeaderboardClient({ users, me }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("awards");

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
        КЛАСАЦИЯ
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
          <span className="text-text-2 text-xs uppercase tracking-wider">ТВОЯТА ПОЗИЦИЯ</span>
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

- [ ] **Step 2: Server page**

`frontend-next/src/app/[locale]/(app)/leaderboard/page.tsx`:

```tsx
import { usersApi } from "@/lib/api";
import { mapApiUser, mapLeaderboardUser } from "@/lib/api/mappers";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";

export default async function LeaderboardPage() {
  const [meRes, lbRes] = await Promise.all([
    usersApi.getMe(),
    usersApi.getLeaderboard(),
  ]);
  const me = mapApiUser(await meRes.json());
  const raw = (await lbRes.json()) as Record<string, unknown>[];
  const users = raw.map((u, i) => mapLeaderboardUser(u, i + 1));

  return <LeaderboardClient users={users} me={me} />;
}
```

- [ ] **Step 3: Build + smoke**

```bash
npm run build 2>&1 | grep -E "leaderboard|error" | head -10
```

Expected: `/[locale]/leaderboard` appears in route table; no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/leaderboard/LeaderboardClient.tsx 'src/app/[locale]/(app)/leaderboard'
git commit -m "feat(next): leaderboard page (server fetch + client sort tabs + podium)"
```

---

## Task 5: Profile sub-components

**Files:**
- Create: `frontend-next/src/components/profile/ProfileHero.tsx`
- Create: `frontend-next/src/components/profile/XpBar.tsx`
- Create: `frontend-next/src/components/profile/StatCards.tsx`
- Create: `frontend-next/src/components/profile/StatBars.tsx`
- Create: `frontend-next/src/components/profile/BadgeGrid.tsx`
- Create: `frontend-next/src/components/profile/ActivityChart.tsx`
- Create: `frontend-next/src/components/profile/SettingsPanel.tsx`

All seven are client components. They take props (typed off `User`) and render — no fetching inside.

- [ ] **Step 1: ProfileHero**

`frontend-next/src/components/profile/ProfileHero.tsx`:

```tsx
"use client";

import type { User } from "@/lib/api/mappers";

export function ProfileHero({ user }: { user: User }) {
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
              VERIFIED
            </span>
          )}
        </div>
        <div className="text-text-2 text-xs uppercase tracking-wider mt-1">{user.level}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: XpBar**

`frontend-next/src/components/profile/XpBar.tsx`:

```tsx
"use client";

import type { User } from "@/lib/api/mappers";

export function XpBar({ user }: { user: User }) {
  const next = user.nextLevelPts;
  const pct = next > user.points ? Math.min((user.points / next) * 100, 100) : 100;
  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4">
      <div className="flex items-center justify-between text-text-2 text-xs uppercase tracking-wider mb-2">
        <span>Към следващо ниво</span>
        <span className="text-text-1">{user.points.toLocaleString()} / {next === Infinity ? "∞" : next.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-primary-dim overflow-hidden">
        <div className="h-full bg-accent-pink transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: StatCards**

`frontend-next/src/components/profile/StatCards.tsx`:

```tsx
"use client";

import { Star, Paintbrush, MapPin } from "lucide-react";
import type { User } from "@/lib/api/mappers";

export function StatCards({ user }: { user: User }) {
  const items = [
    { icon: Star, val: user.points.toLocaleString(), label: "ТОЧКИ" },
    { icon: Paintbrush, val: user.cleanings, label: "ПОЧИСТВАНИЯ" },
    { icon: MapPin, val: user.reports, label: "СИГНАЛИ" },
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

- [ ] **Step 4: StatBars**

`frontend-next/src/components/profile/StatBars.tsx`:

```tsx
"use client";

import { Star, Paintbrush, MapPin, Flame } from "lucide-react";
import type { User } from "@/lib/api/mappers";

export function StatBars({ user }: { user: User }) {
  const items = [
    { icon: Star,       key: "ОБЩО ТОЧКИ",        val: user.points.toLocaleString(),                 pct: user.points / 5000 },
    { icon: Paintbrush, key: "ПОЧИСТВАНИЯ",       val: user.cleanings.toString(),                    pct: user.cleanings / 50 },
    { icon: MapPin,     key: "СИГНАЛИ",           val: user.reports.toString(),                      pct: user.reports / 30 },
    { icon: Flame,      key: "РЕКОРД НА СТРИЙК",  val: `${user.streak} дни`,                         pct: user.streak / 30 },
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

- [ ] **Step 5: BadgeGrid**

`frontend-next/src/components/profile/BadgeGrid.tsx`:

```tsx
"use client";

import { BADGES } from "@/lib/data/badges";
import { deriveBadges } from "@/lib/api/mappers";
import type { User } from "@/lib/api/mappers";

export function BadgeGrid({ user }: { user: User }) {
  const earned = new Set(deriveBadges(user).map((b) => b.id));
  return (
    <div className="animate-fade-up">
      <div className="text-text-3 text-xs uppercase tracking-wider mb-3">
        {earned.size} / {BADGES.length} ОТКЛЮЧЕНИ
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BADGES.map((b) => {
          const got = earned.has(b.id);
          return (
            <div
              key={b.id}
              title={b.desc}
              className={`relative rounded-xl border p-3 flex flex-col items-center gap-1 transition ${
                got ? "border-accent-pink-border bg-accent-pink-dim" : "border-brand-border bg-bg-card opacity-50"
              }`}
            >
              <div className="text-2xl">★</div>
              <div className={got ? "text-text-1 text-xs text-center" : "text-text-3 text-xs text-center"}>{b.name}</div>
              {got && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-pink" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: ActivityChart**

The chart is intentionally static. Real activity data ships with the backend `/users/me/activity` endpoint integration in a future phase.

`frontend-next/src/components/profile/ActivityChart.tsx`:

```tsx
"use client";

const WEEK_DATA = [
  [2, 5, 1, 3, 6, 4, 2],
  [4, 3, 7, 2, 5, 8, 3],
  [1, 6, 3, 5, 2, 4, 7],
  [5, 3, 6, 4, 7, 2, 5],
];
const DAYS = ["П", "В", "С", "Ч", "П", "С", "Н"];
const CHART_MAX = Math.max(...WEEK_DATA.flat());

export function ActivityChart() {
  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4 animate-fade-up">
      <div className="text-text-3 text-xs uppercase tracking-wider mb-3">Последни 4 седмици</div>
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
                {wi === WEEK_DATA.length - 1 && <span className="text-text-3 text-[0.625rem]">{DAYS[di]}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: SettingsPanel**

`frontend-next/src/components/profile/SettingsPanel.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const [notifs, toggleNotifs] = useStoredFlag("cw_notifs", true);
  const [gps, toggleGps] = useStoredFlag("cw_gps", true);
  const [emails, toggleEmails] = useStoredFlag("cw_emails", false);

  const logoutAction = logout.bind(null, locale);

  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4 animate-fade-up">
      <Toggle label="Push уведомления" desc="Известия в браузъра при нови сигнали" value={notifs} onToggle={toggleNotifs} />
      <Toggle label="GPS" desc="Локация при подаване на сигнал" value={gps} onToggle={toggleGps} />
      <Toggle label="Имейли" desc="Седмично резюме" value={emails} onToggle={toggleEmails} />
      <form action={logoutAction} className="mt-4">
        <Button type="submit" variant="destructive" className="w-full">ИЗХОД</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/profile/
git commit -m "feat(next): profile sub-components (hero, xp, stats, badges, activity, settings)"
```

---

## Task 6: ProfileClient + page

**Files:**
- Create: `frontend-next/src/components/profile/ProfileClient.tsx`
- Create: `frontend-next/src/app/[locale]/(app)/profile/page.tsx`

- [ ] **Step 1: ProfileClient**

`frontend-next/src/components/profile/ProfileClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { User } from "@/lib/api/mappers";
import { ProfileHero } from "./ProfileHero";
import { XpBar } from "./XpBar";
import { StatCards } from "./StatCards";
import { StatBars } from "./StatBars";
import { BadgeGrid } from "./BadgeGrid";
import { ActivityChart } from "./ActivityChart";
import { SettingsPanel } from "./SettingsPanel";

type Tab = "stats" | "badges" | "activity" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "stats",    label: "СТАТИСТИКИ" },
  { id: "badges",   label: "БЕЙДЖОВЕ" },
  { id: "activity", label: "АКТИВНОСТ" },
  { id: "settings", label: "НАСТРОЙКИ" },
];

export function ProfileClient({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <ProfileHero user={user} />

      <div className="flex bg-bg-card rounded-md p-1 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded text-xs uppercase tracking-wider transition ${
              tab === t.id ? "bg-accent-pink text-bg-base" : "text-text-2 hover:text-text-1"
            }`}
          >
            {t.label}
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

- [ ] **Step 2: Server page**

`frontend-next/src/app/[locale]/(app)/profile/page.tsx`:

```tsx
import { usersApi } from "@/lib/api";
import { mapApiUser } from "@/lib/api/mappers";
import { ProfileClient } from "@/components/profile/ProfileClient";

export default async function ProfilePage() {
  const res = await usersApi.getMe();
  const user = mapApiUser(await res.json());
  return <ProfileClient user={user} />;
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | grep -E "profile|error" | head -10   # expect: /[locale]/profile in route table
git add 'src/app/[locale]/(app)/profile' src/components/profile/ProfileClient.tsx
git commit -m "feat(next): profile page (server fetch + tabs + all panels)"
```

---

## Task 7: Rewards catalog + sub-components + dialog primitive

**Files:**
- Add shadcn primitive: `dialog`
- Create: `frontend-next/src/lib/data/rewards.ts`
- Create: `frontend-next/src/components/rewards/RewardsHero.tsx`
- Create: `frontend-next/src/components/rewards/RewardCard.tsx`
- Create: `frontend-next/src/components/rewards/ClaimConfirm.tsx`
- Create: `frontend-next/src/components/rewards/HistoryList.tsx`

- [ ] **Step 1: Install dialog**

```bash
npx shadcn@latest add dialog
```

- [ ] **Step 2: Rewards catalog**

`frontend-next/src/lib/data/rewards.ts`:

```ts
export interface Reward {
  id: number;
  icon: string;
  name: string;
  desc: string;
  partner: string;
  cost: number;
  category: "food" | "eco" | "transport" | "experience" | "status";
  featured?: boolean;
  hot?: boolean;
  newBadge?: boolean;
}

export const REWARDS: Reward[] = [
  { id: 1, icon: "coffee",    name: "Безплатно кафе",        desc: "Една безплатна напитка в партньорски кафенета в София.",   partner: "COSTA COFFEE · STARBUCKS",                cost: 500,  category: "food",       featured: true, hot: true },
  { id: 2, icon: "tree-pine", name: "Засади дърво",          desc: "Организираме засаждане на дърво в твое име в парк в София.", partner: "SOFIA GREEN INITIATIVE",                cost: 800,  category: "eco" },
  { id: 3, icon: "ticket",    name: "Безплатен транспорт",   desc: "Карта за градски транспорт за 1 месец.",                    partner: "ЦЕНТЪРА ЗА ГРАДСКА МОБИЛНОСТ",          cost: 1200, category: "transport",  newBadge: true },
  { id: 4, icon: "utensils",  name: "Отстъпка 20% храна",    desc: "20% намаление в партньорски ресторанти.",                   partner: "HAPPY · HAPPY BAR & GRILL",             cost: 350,  category: "food" },
  { id: 5, icon: "recycle",   name: "Еко продуктов пакет",   desc: "Комплект от биоразградими продукти от SofiaEco.",           partner: "SOFIAECO STORE",                        cost: 600,  category: "eco" },
  { id: 6, icon: "medal",     name: "Verified User статус",  desc: "Получи официалния VRF badge и 2x точки за всяка задача.",   partner: "CHIST PLATFORM",                        cost: 3000, category: "status" },
  { id: 7, icon: "ticket",    name: "Концерт / Събитие",     desc: "2 безплатни билета за партньорско събитие в София.",        partner: "SOFIA LIVE",                            cost: 2000, category: "experience", newBadge: true },
  { id: 8, icon: "droplets",  name: "Почистващ комплект",    desc: "Професионален еко комплект за почистване.",                 partner: "ECO TOOLS BG",                          cost: 400,  category: "eco" },
];

export const CATEGORIES = ["all", "food", "eco", "transport", "experience", "status"] as const;
export type Category = (typeof CATEGORIES)[number];
```

- [ ] **Step 3: RewardsHero**

`frontend-next/src/components/rewards/RewardsHero.tsx`:

```tsx
"use client";

import type { User } from "@/lib/api/mappers";

export function RewardsHero({ user }: { user: User }) {
  return (
    <div className="relative rounded-2xl border border-accent-pink-border bg-accent-pink-dim p-6 flex flex-col items-center gap-2 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, var(--color-accent-pink-glow), transparent 70%)" }} />
      <div className="relative text-text-2 text-xs uppercase tracking-wider">НАЛИЧНИ ТОЧКИ</div>
      <div className="relative text-text-1 text-4xl">{user.points.toLocaleString()}</div>
      <div className="relative text-text-3 text-xs uppercase tracking-wider">CHIST POINTS</div>
      <div className="relative grid grid-cols-3 gap-4 w-full pt-3 mt-2 border-t border-accent-pink-border/40">
        {[
          { val: user.cleanings, key: "ПОЧИСТВАНИЯ" },
          { val: user.reports,    key: "СИГНАЛИ" },
          { val: user.streak,     key: "СТРИЙК" },
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

- [ ] **Step 4: RewardCard**

`frontend-next/src/components/rewards/RewardCard.tsx`:

```tsx
"use client";

import { Star, Lock, Flame, Sparkles } from "lucide-react";
import type { Reward } from "@/lib/data/rewards";

interface Props {
  reward: Reward;
  userPoints: number;
  claimed: boolean;
  onClaim: (r: Reward) => void;
}

export function RewardCard({ reward, userPoints, claimed, onClaim }: Props) {
  const canAfford = userPoints >= reward.cost;
  const isLocked = !canAfford && !claimed;
  const progress = Math.min((userPoints / reward.cost) * 100, 100);
  const needMore = reward.cost - userPoints;

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
          <Flame size={10} strokeWidth={2} /> HOT
        </span>
      )}
      {reward.newBadge && (
        <span className="absolute top-2 right-2 text-[0.625rem] uppercase tracking-wider text-accent-pink flex items-center gap-1">
          <Sparkles size={10} strokeWidth={2} /> NEW
        </span>
      )}
      <div className="text-2xl">★</div>
      <div className="text-text-1 text-sm">{reward.name}</div>
      <div className="text-text-3 text-xs leading-snug">{reward.desc}</div>
      <div className="text-text-3 text-[0.625rem] uppercase tracking-wider">{reward.partner}</div>
      {isLocked && (
        <div>
          <div className="h-1 rounded-full bg-brand-primary-dim overflow-hidden">
            <div className="h-full bg-text-2" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-text-3 text-[0.625rem] uppercase tracking-wider mt-1">
            Още {needMore.toLocaleString()} точки
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className={`flex items-center gap-1 text-sm ${isLocked ? "text-text-3" : "text-text-1"}`}>
          <Star size={12} strokeWidth={2} /> {reward.cost.toLocaleString()}
        </span>
        {claimed && <span className="text-text-3 text-[0.625rem] uppercase tracking-wider">ВЗЕТО</span>}
        {isLocked && <Lock size={14} strokeWidth={2} className="text-text-3" />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: ClaimConfirm**

`frontend-next/src/components/rewards/ClaimConfirm.tsx`:

```tsx
"use client";

import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Reward } from "@/lib/data/rewards";

interface Props {
  reward: Reward | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClaimConfirm({ reward, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={reward != null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        {reward && (
          <>
            <DialogHeader>
              <DialogTitle>Потвърди награда</DialogTitle>
            </DialogHeader>
            <div className="text-2xl">★</div>
            <div className="text-text-1 text-sm">
              <strong>{reward.name}</strong>
              <p className="mt-1 text-text-2">{reward.desc}</p>
              <p className="mt-2 text-text-3 text-xs">Партньор: {reward.partner}</p>
            </div>
            <div className="flex items-center gap-1.5 text-text-1">
              <Star size={14} strokeWidth={2} /> {reward.cost.toLocaleString()} точки
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onCancel}>Отказ</Button>
              <Button onClick={onConfirm}>Вземи</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: HistoryList**

`frontend-next/src/components/rewards/HistoryList.tsx`:

```tsx
"use client";

export interface HistoryItem {
  id: number;
  icon: string;
  name: string;
  date: string;
  pts: number;
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center text-text-3 text-xs uppercase tracking-wider py-6">
        Няма история
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

- [ ] **Step 7: Commit**

```bash
git add src/lib/data/rewards.ts src/components/rewards/ src/components/ui/dialog.tsx components.json package.json package-lock.json
git commit -m "feat(next): rewards catalog + sub-components + dialog primitive"
```

---

## Task 8: RewardsClient + page

Claim flow: clicking a card opens `ClaimConfirm`. Confirm:
1. Pushes a notification via `AppContext.pushNotification` (rendered as a toast by `NotificationBridge`).
2. Appends a `HistoryItem` to local state + localStorage `cw_reward_history`.
3. Adds the reward id to a `claimed` Set so the card greys out.

The points deduction is **not** persisted — the backend has no rewards endpoint yet. This matches the old app's behavior (localStorage-only) and gets wired to a real action when the backend ships.

**Files:**
- Create: `frontend-next/src/components/rewards/RewardsClient.tsx`
- Create: `frontend-next/src/app/[locale]/(app)/rewards/page.tsx`

- [ ] **Step 1: RewardsClient**

`frontend-next/src/components/rewards/RewardsClient.tsx`:

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
    pushNotification({ type: "success", message: `${pending.name} — взето успешно!`, duration: 4000 });
    setClaimed((s) => new Set([...s, pending.id]));
    const now = new Date();
    const item: HistoryItem = {
      id: Date.now(),
      icon: pending.icon,
      name: pending.name,
      date: now.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" }),
      pts: -pending.cost,
    };
    const updated = [item, ...history];
    setHistory(updated);
    saveHistory(updated);
    setPending(null);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <h1 className="text-text-1 text-xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>НАГРАДИ</h1>

      <RewardsHero user={user} />

      <div className="flex bg-bg-card rounded-md p-1 gap-1">
        {[{ id: "shop" as const, label: "МАГАЗИН" }, { id: "history" as const, label: "ИСТОРИЯ" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded text-xs uppercase tracking-wider transition ${
              tab === t.id ? "bg-accent-pink text-bg-base" : "text-text-2 hover:text-text-1"
            }`}
          >
            {t.label}
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
                {c === "all" ? "ВСИЧКИ" : c.toUpperCase()}
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

- [ ] **Step 2: Server page**

`frontend-next/src/app/[locale]/(app)/rewards/page.tsx`:

```tsx
import { usersApi } from "@/lib/api";
import { mapApiUser } from "@/lib/api/mappers";
import { RewardsClient } from "@/components/rewards/RewardsClient";

export default async function RewardsPage() {
  const res = await usersApi.getMe();
  const user = mapApiUser(await res.json());
  return <RewardsClient user={user} />;
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | grep -E "rewards|error" | head -10   # expect: /[locale]/rewards in route table
git add 'src/app/[locale]/(app)/rewards' src/components/rewards/RewardsClient.tsx
git commit -m "feat(next): rewards page (shop + history + claim modal + sonner toast)"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Tests + build**

```bash
npm test          # expect: 55 passing (48 baseline + 7 new mapper tests)
npm run build     # expect: green, with /[locale]/{leaderboard,profile,rewards} in route table
```

- [ ] **Step 2: Manual mock walkthrough**

Log in as `test@chist.bg / test1234`. Verify each page in turn:

| Path | Expected |
|---|---|
| `/bg/leaderboard` | Heading "КЛАСАЦИЯ", 3 sort tabs (awards/cleanings/points), top-3 podium with EcoMaria #1, my-rank pill showing TestUser, full sorted list |
| Click "ПОЧИСТВАНИЯ" tab | List re-sorts by cleanings; podium updates |
| `/bg/profile` | Hero card with avatar "TE" + VERIFIED chip + level "НОВИЧ", 4 tabs, XP bar + 3 stat cards |
| Click БЕЙДЖОВЕ tab | 8 badges; first_report + first_clean lit, others dimmed |
| Click НАСТРОЙКИ → toggle GPS off | Toggle flips; refresh page → setting persists |
| Click ИЗХОД | Redirects to `/bg/login`, cookie cleared |
| Log back in, `/bg/rewards` | Hero with 250 points, MAGAZIN tab, 8 reward cards (coffee featured, all locked because 250 < 350) |
| Click an affordable reward (after manually editing MOCK_ME.points to 5000 — optional) | Confirm modal opens → confirm → success toast in top-right + card greys out + entry in history tab |

- [ ] **Step 3: Tag**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git tag -a nextjs-phase-5-complete -m "Phase 5 (leaderboard, profile, rewards) complete: all protected pages render server-side with full client interactivity, badge derivation, sonner toasts, localStorage-backed reward history."
```

---

## Phase 5 Definition of Done

- 55 vitest tests pass.
- Production build green.
- Full mock walkthrough above succeeds end-to-end.
- All four Navbar links (Reports/Leaderboard/Rewards/Profile) reach real pages.

## What's NOT in Phase 5

- **Phase 6:** Locale switcher + namespacing inline Cyrillic strings ("КЛАСАЦИЯ", "БЕЙДЖОВЕ", etc.) into next-intl catalogs.
- **Phase 7:** Helm + cutover.
- Real backend wiring for badges, activity, reward claims — those endpoints don't exist yet. Badges are derived client-side; activity is static; rewards are localStorage-only.
- Server-side persistence of profile settings (`cw_notifs`, `cw_gps`, `cw_emails`). The old app also stored these in localStorage only.
