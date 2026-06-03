"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider, useMessages, useLocale } from "next-intl";
import { MarkerPopup } from "./MarkerPopup";
import type { Report } from "@/lib/api/mappers";

interface MapViewProps {
  reports: Report[];
  selectedId: string | null;
  onSelectReport: (id: string) => void;
  locale: string;
}

const MARKER_COLORS: Record<string, { fill: string; glow: string }> = {
  critical: { fill: "#FF2D55", glow: "rgba(255,45,85,0.7)" },
  high: { fill: "#FF9F0A", glow: "rgba(255,159,10,0.6)" },
  medium: { fill: "#FFD60A", glow: "rgba(255,214,10,0.5)" },
  low: { fill: "#30D158", glow: "rgba(48,209,88,0.5)" },
  done: { fill: "#32D74B", glow: "rgba(50,215,75,0.6)" },
};

function getMarkerStyle(report: Report) {
  if (report.status === "done") return MARKER_COLORS.done;
  return MARKER_COLORS[report.severity] ?? { fill: "#FF4D94", glow: "rgba(255,77,148,0.6)" };
}

function createMarkerElement(color: string, glow: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = "44px";
  el.style.height = "56px";
  el.style.filter = `drop-shadow(0 0 12px ${glow})`;
  el.style.transition = "filter 0.25s ease";
  const safeId = color.replace("#", "");
  el.innerHTML = `
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g-${safeId}" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.75"/>
        </radialGradient>
        <filter id="glow-${safeId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 34 22 34s22-17.5 22-34C44 9.85 34.15 0 22 0z"
        fill="url(#g-${safeId})" filter="url(#glow-${safeId})"/>
      <circle cx="22" cy="20" r="10" fill="white" fill-opacity="0.95"/>
      <circle cx="22" cy="20" r="6" fill="${color}"/>
    </svg>
  `;
  el.addEventListener("mouseenter", () => {
    el.style.filter = `drop-shadow(0 0 22px ${glow})`;
    el.style.zIndex = "10";
  });
  el.addEventListener("mouseleave", () => {
    el.style.filter = `drop-shadow(0 0 12px ${glow})`;
    el.style.zIndex = "auto";
  });
  return el;
}

interface PopupEntry {
  popup: maplibregl.Popup;
  root: Root;
  /** Guards against the double teardown that happens when popup.remove() fires
   *  the "close" event our own replace path is already handling. */
  closed: boolean;
}

/** Tears a popup down exactly once. The React root is unmounted in a microtask
 *  rather than synchronously: maplibre fires "close" / we replace popups from
 *  inside React effects, and calling root.unmount() while React is mid-render
 *  throws "Attempted to synchronously unmount a root while React was already
 *  rendering." Deferring lets the current render/commit finish first. */
function teardownPopup(entry: PopupEntry) {
  if (entry.closed) return;
  entry.closed = true;
  entry.popup.remove();
  queueMicrotask(() => entry.root.unmount());
}

export default function MapView({ reports, selectedId, onSelectReport, locale }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<PopupEntry | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const openPopupRef = useRef<(report: Report) => void>(() => {});

  // The popup is mounted in a detached createRoot (maplibre owns the DOM node),
  // so it lives outside the page's NextIntlClientProvider. Capture the active
  // messages + locale here and re-provide them inside that root, otherwise the
  // useTranslations() calls in MarkerPopup throw "no intl context found".
  const messages = useMessages();
  const intlLocale = useLocale();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [23.3219, 42.6977],
      zoom: 12,
      attributionControl: false,
    });
    map.on("error", (e: { error?: { message?: string } }) => {
      if (e?.error?.message?.includes("projection")) return;
      console.error(e);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    map.on("load", () => setMapLoaded(true));
    return () => {
      if (popupRef.current) {
        teardownPopup(popupRef.current);
        popupRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const openPopup = useCallback((report: Report) => {
    const map = mapRef.current;
    if (!map) return;
    if (popupRef.current) {
      teardownPopup(popupRef.current);
      popupRef.current = null;
    }
    const popupNode = document.createElement("div");
    const root = createRoot(popupNode);
    root.render(
      <NextIntlClientProvider locale={intlLocale} messages={messages}>
        <MarkerPopup report={report} locale={locale} />
      </NextIntlClientProvider>
    );
    const popup = new maplibregl.Popup({
      offset: [0, -58],
      closeButton: true,
      closeOnClick: false,
      maxWidth: "360px",
      className: "chist-popup",
    })
      .setLngLat([report.lng, report.lat])
      .setDOMContent(popupNode)
      .addTo(map);
    const entry: PopupEntry = { popup, root, closed: false };
    popup.on("close", () => {
      // User dismissed via the popup's close button — tear down the same way.
      if (popupRef.current === entry) popupRef.current = null;
      teardownPopup(entry);
    });
    popupRef.current = entry;
  }, [locale, intlLocale, messages]);

  openPopupRef.current = openPopup;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const currentIds = new Set(reports.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    reports.forEach((report) => {
      const existing = markersRef.current.get(report.id);
      if (existing) {
        existing.setLngLat([report.lng, report.lat]);
        return;
      }
      const style = getMarkerStyle(report);
      const el = createMarkerElement(style.fill, style.glow);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectReport(report.id);
        openPopupRef.current(report);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([report.lng, report.lat])
        .addTo(map);
      markersRef.current.set(report.id, marker);
    });
  }, [reports, onSelectReport, mapLoaded]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const report = reports.find((r) => r.id === selectedId);
    if (!report) return;
    mapRef.current.flyTo({
      center: [report.lng, report.lat],
      zoom: 15,
      duration: 1200,
      essential: true,
    });
    openPopup(report);
  }, [selectedId, reports, openPopup]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
      <style>{`
        .chist-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,77,148,0.2) !important;
          overflow: hidden;
        }
        .chist-popup .maplibregl-popup-tip { border-top-color: #0F172A !important; }
        .chist-popup .maplibregl-popup-close-button {
          color: rgba(255,255,255,0.4) !important;
          font-size: 20px !important;
          right: 10px !important;
          top: 10px !important;
        }
        .chist-popup .maplibregl-popup-close-button:hover { color: #FF4D94 !important; background: transparent !important; }
        .maplibregl-ctrl-attrib { background: rgba(15,23,42,0.7) !important; color: rgba(255,255,255,0.3) !important; font-size: 10px !important; }
        .maplibregl-ctrl-group { background: rgba(15,23,42,0.85) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; overflow: hidden; }
        .maplibregl-ctrl-group button { width: 42px !important; height: 42px !important; }
        .maplibregl-ctrl-group button span { filter: invert(1) !important; }
      `}</style>
    </>
  );
}
