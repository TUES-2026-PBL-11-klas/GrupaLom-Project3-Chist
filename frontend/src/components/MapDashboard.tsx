import { useState, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext.tsx";
import { List, X } from "lucide-react";
import Navbar from "./Navbar.tsx";
import Sidebar from "./Sidebar.tsx";
import MapContainer from "./MapContainer.tsx";
import { t } from "../i18n.ts";
import type { Lang } from "../i18n.ts";
import "../styles/MapDashboard.css";

interface MapDashboardProps {
  onNavigate: (tab: string) => void;
  currentTab: string;
  lang: Lang;
  onToggleLang: () => void;
}

export default function MapDashboard({ onNavigate, currentTab, lang, onToggleLang }: MapDashboardProps) {
  const { reports, claimReport, completeReport, selectedReportId, selectReport } = useApp();

  
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const i = t(lang);

  /* Filter reports by active filter + search query */
  const filteredReports = useMemo(() => {
    let filtered = reports;

    switch (activeFilter) {
      case "critical":
        filtered = filtered.filter((r: any) => r.severity === "critical");
        break;
      case "high":
        filtered = filtered.filter((r: any) => r.severity === "high");
        break;
      case "open":
        filtered = filtered.filter((r: any) => r.status === "open");
        break;
      case "done":
        filtered = filtered.filter((r: any) => r.status === "done");
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r: any) =>
          r.title.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.district?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [reports, activeFilter, searchQuery]);

  const handleSelectReport = useCallback(
    (id: string | number) => {
      selectReport(id);
      setMobileOpen(false);
    },
    [selectReport]
  );

  return (
    <div className="map-dashboard">
      <Navbar lang={lang} onToggleLang={onToggleLang} currentTab={currentTab} onNavigate={onNavigate} />

      <Sidebar
        reports={filteredReports}
        allReports={reports}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedId={selectedReportId}
        onSelectReport={handleSelectReport}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        i={i}
        lang={lang}
      />

      <main className="map-dashboard__main">
        <MapContainer
          reports={filteredReports}
          selectedId={selectedReportId}
          onSelectReport={handleSelectReport}
          onClaim={claimReport}
          onComplete={completeReport}
          i={i}
          lang={lang}
        />
      </main>

      <button
        onClick={() => setMobileOpen((v) => !v)}
        className={`map-dashboard__mobile-toggle ${mobileOpen ? "map-dashboard__mobile-toggle--active" : ""}`}
        aria-label={mobileOpen ? "Затвори сигнали" : "Отвори сигнали"}
      >
        {mobileOpen ? <X size={20} strokeWidth={2.5} /> : <List size={20} strokeWidth={2.5} />}
      </button>

      <div className="map-dashboard__glow-tr" />
      <div className="map-dashboard__glow-bl" />
    </div>
  );
}
