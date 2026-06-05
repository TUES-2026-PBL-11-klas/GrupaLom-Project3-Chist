"use client";

import { Check, Flame, Paintbrush, Trophy, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LeaderboardUser } from "@/lib/api/mappers";

const RANK_COLORS = ["#ffffff", "#aaaaaa", "#777777"];

export type SortBy = "awards" | "cleanings" | "points";

export function LeaderRow({ user, isMe, index, sortBy }: { user: LeaderboardUser; isMe: boolean; index: number; sortBy: SortBy }) {
  const tLb = useTranslations("Leaderboard");
  const tLevels = useTranslations("Levels");
  const tBadges = useTranslations("Badges");
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
              <span key={b.id} title={tBadges(`${b.id}.name` as `${string}.name`)} className="text-accent-pink">
                <Star size={11} strokeWidth={2} className="inline fill-current" />
              </span>
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
