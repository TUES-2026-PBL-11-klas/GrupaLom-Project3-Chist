"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

export interface HistoryItem {
  id: number;
  icon: string;
  name: string;
  date: string;
  pts: number;
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const t = useTranslations("Rewards.history");
  if (items.length === 0) {
    return (
      <div className="text-center text-text-3 text-xs uppercase tracking-wider py-6">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((h) => (
        <div
          key={h.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-brand-border bg-bg-card animate-fade-up"
        >
          <div className="w-9 h-9 grid place-items-center rounded-md border border-brand-border bg-brand-primary-dim text-accent-pink"><Star size={16} strokeWidth={1.8} className="fill-current" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-text-1 text-sm">{h.name}</div>
            <div className="text-text-3 text-xs">{h.date}</div>
          </div>
          <div className={h.pts > 0 ? "text-text-1" : "text-status-red"}>
            {h.pts > 0 ? "+" : ""}{h.pts}
          </div>
        </div>
      ))}
    </div>
  );
}
