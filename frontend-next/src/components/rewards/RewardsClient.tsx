"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Rewards");
  const tCat = useTranslations("RewardCatalog");
  const tClaim = useTranslations("Rewards.claim");
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
    const name = tCat(`${pending.id}.name` as `${string}.name`);
    pushNotification({ type: "success", message: tClaim("success", { name }), duration: 4000 });
    setClaimed((s) => new Set([...s, pending.id]));
    const now = new Date();
    const item: HistoryItem = {
      id: Date.now(),
      icon: "star",
      name,
      date: now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
      pts: -pending.cost,
    };
    const updated = [item, ...history];
    setHistory(updated);
    saveHistory(updated);
    setPending(null);
  };

  return (
    <main className="anim-fade-up max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <h1 className="display-heading text-text-1 text-xl">{t("title")}</h1>

      <RewardsHero user={user} />

      <div className="flex bg-bg-card rounded-md p-1 gap-1">
        {[{ id: "shop" as const, label: t("tabs.shop") }, { id: "history" as const, label: t("tabs.history") }].map((tt) => (
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
                {t(`categories.${c}`)}
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
