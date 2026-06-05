"use client";

import type { Report } from "@/lib/api/mappers";
import { MapPin, Flame } from "lucide-react";
import { useTranslations } from "next-intl";

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: "#FF2D55", bg: "rgba(255,45,85,0.12)" },
  high:     { color: "#FF9F0A", bg: "rgba(255,159,10,0.12)" },
  medium:   { color: "#FFD60A", bg: "rgba(255,214,10,0.12)" },
  low:      { color: "#30D158", bg: "rgba(48,209,88,0.12)" },
};

interface ReportCardProps {
  report: Report;
  selected: boolean;
  onSelect: () => void;
}

export function ReportCard({ report, selected, onSelect }: ReportCardProps) {
  const tSev = useTranslations("Severity");
  const sev = SEVERITY_STYLES[report.severity] ?? SEVERITY_STYLES.medium;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
        selected
          ? "border-accent-pink-border bg-accent-pink-dim"
          : "border-brand-border bg-bg-card hover:bg-bg-card-hover"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1"
          style={{ color: sev.color, background: sev.bg }}
        >
          <Flame size={10} /> {tSev(report.severity as "critical" | "high" | "medium" | "low")}
        </span>
        <span className="text-text-3 text-[10px] ml-auto">{report.time}</span>
      </div>
      <div className="text-text-1 text-sm line-clamp-2">{report.description}</div>
      <div className="flex items-center gap-1 mt-1 text-[11px] text-text-3">
        <MapPin size={11} /> {report.district}
      </div>
    </button>
  );
}
