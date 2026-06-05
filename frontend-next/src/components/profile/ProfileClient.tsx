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
}
