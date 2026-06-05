"use client";

import type { Report } from "@/lib/api/mappers";
import { MapPin, Flame, User, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface MarkerPopupProps {
  report: Report;
  locale: string;
}

export function MarkerPopup({ report, locale }: MarkerPopupProps) {
  const tSev = useTranslations("Severity");
  const tRD = useTranslations("ReportDetail");
  const severityColor: Record<string, string> = {
    critical: "#FF2D55",
    high: "#FF9F0A",
    medium: "#FFD60A",
    low: "#30D158",
  };
  const color = report.status === "done" ? "#32D74B" : (severityColor[report.severity] ?? "#FF4D94");

  return (
    <div className="rounded-2xl bg-bg-surface border border-brand-border overflow-hidden text-text-1 w-[320px]">
      <div className="px-4 py-3 border-b border-brand-border" style={{ background: `${color}1f` }}>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest" style={{ color }}>
          <Flame size={12} />
          {tSev(report.severity as "critical" | "high" | "medium" | "low")}
          <span className="ml-auto text-text-3 normal-case tracking-normal">{report.time}</span>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="text-sm text-text-1">{report.description}</div>
        <div className="flex items-center gap-1.5 text-xs text-text-2">
          <MapPin size={12} className="text-text-3" /> {report.district}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-2">
          <User size={12} className="text-text-3" /> {report.reporter || tRD("unknownReporter")}
        </div>
        <a
          href={`/${locale}/reports/${report.id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-accent-pink hover:text-pink-light transition"
        >
          {tRD("openLink")} <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
