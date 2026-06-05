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
