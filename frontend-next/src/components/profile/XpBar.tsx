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
