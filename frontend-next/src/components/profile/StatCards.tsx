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
