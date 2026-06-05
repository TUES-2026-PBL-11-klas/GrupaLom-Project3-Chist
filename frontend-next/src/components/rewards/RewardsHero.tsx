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
