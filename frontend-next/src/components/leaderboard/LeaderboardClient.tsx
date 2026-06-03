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
    <main className="anim-fade-up max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <h1 className="display-heading text-text-1 text-xl">
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
