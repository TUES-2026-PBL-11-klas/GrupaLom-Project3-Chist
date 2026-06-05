"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SOFIA_CENTER, clampLat, clampLng } from "@/lib/geo";

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

function createPinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cursor = "grab";
  el.style.width = "44px";
  el.style.height = "56px";
  el.style.filter = "drop-shadow(0 0 12px rgba(255,77,148,0.6))";
  el.innerHTML = `
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 34 22 34s22-17.5 22-34C44 9.85 34.15 0 22 0z"
        fill="#FF4D94" fill-opacity="0.92"/>
      <circle cx="22" cy="20" r="10" fill="white" fill-opacity="0.95"/>
      <circle cx="22" cy="20" r="6" fill="#FF4D94"/>
    </svg>
  `;
  return el;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // Keep the latest onChange without re-running the init effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: [number, number] = lat && lng ? [lng, lat] : SOFIA_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: start,
      zoom: 12,
      attributionControl: false,
    });
    map.on("error", (e: { error?: { message?: string } }) => {
      if (e?.error?.message?.includes("projection")) return;
      console.error(e);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const marker = new maplibregl.Marker({ element: createPinElement(), anchor: "bottom", draggable: true })
      .setLngLat(start)
      .addTo(map);
    marker.on("dragend", () => {
      const { lat: mLat, lng: mLng } = marker.getLngLat();
      onChangeRef.current(clampLat(mLat), clampLng(mLng));
    });

    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current(clampLat(e.lngLat.lat), clampLng(e.lngLat.lng));
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Intentionally run once — props are synced via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external coordinate changes (e.g. "use my location") onto the map.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !lat || !lng) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 800, essential: true });
  }, [lat, lng]);

  return (
    <div ref={containerRef} className="w-full h-[320px] rounded-xl overflow-hidden border border-brand-border" />
  );
}
