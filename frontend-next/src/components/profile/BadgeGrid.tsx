"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
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
              <div className={got ? "text-accent-pink" : "text-text-3"}><Star size={22} strokeWidth={1.8} className={got ? "fill-current" : ""} /></div>
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
