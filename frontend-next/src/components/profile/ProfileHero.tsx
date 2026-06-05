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
