"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Flame, Map as MapIcon, List } from "lucide-react";
import { useTranslations } from "next-intl";
import { useApp } from "@/context/AppContext";
import { ReportCard } from "./ReportCard";
import type { Report, User } from "@/lib/api/mappers";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] grid place-items-center bg-bg-card text-text-3 text-sm">
      Loading map…
    </div>
  ),
});

interface ReportsClientProps {
  initialReports: Report[];
  user: User | null;
  locale: string;
}

export function ReportsClient({ initialReports, user, locale }: ReportsClientProps) {
  const t = useTranslations("Reports");
  const { selectedReportId, selectReport, filters } = useApp();
  // On narrow screens the list and the map can't share the viewport, so we
  // toggle between them. `listOpen` defaults to the list; tapping the toggle
  // reveals the map. On md+ both panes are always shown side by side.
  const [listOpen, setListOpen] = useState(true);

  const filtered = initialReports.filter((r) => {
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="relative flex flex-col md:flex-row gap-4 h-[calc(100vh-4rem)] p-4">
      <button
        type="button"
        onClick={() => setListOpen((o) => !o)}
        className="md:hidden absolute top-6 right-6 z-20 inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-bg-surface px-3 py-1.5 text-xs uppercase tracking-wider text-text-1 shadow-lg"
      >
        {listOpen ? <MapIcon size={14} /> : <List size={14} />}
        {listOpen ? t("showMap") : t("showList")}
      </button>
      <aside
        className={`${listOpen ? "flex" : "hidden"} md:flex w-full md:w-[360px] flex-col gap-3 overflow-y-auto`}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-brand-border bg-bg-card px-3 py-2.5">
            <div className="text-text-1 text-xl leading-none">{filtered.length}</div>
            <div className="text-text-3 text-[10px] uppercase tracking-wider mt-1">{t("signalsLabel")}</div>
          </div>
          <div className="rounded-xl border border-accent-pink-border bg-accent-pink-dim px-3 py-2.5 flex items-center gap-2">
            <span className="text-accent-pink"><Flame size={18} strokeWidth={2} /></span>
            <div>
              <div className="text-text-1 text-xl leading-none">{user?.streak ?? 0}</div>
              <div className="text-text-3 text-[10px] uppercase tracking-wider mt-1">{t("streakLabel")}</div>
            </div>
          </div>
        </div>

        {filtered.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            selected={selectedReportId === r.id}
            onSelect={() => selectReport(r.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-text-3 text-sm text-center py-8">
            {t("noMatch")}
          </div>
        )}
      </aside>
      <div
        className={`${listOpen ? "hidden" : "block"} md:block flex-1 min-h-0 rounded-2xl overflow-hidden border border-brand-border bg-bg-card`}
      >
        <MapView
          reports={filtered}
          selectedId={selectedReportId}
          onSelectReport={selectReport}
          locale={locale}
        />
      </div>
    </div>
  );
}
