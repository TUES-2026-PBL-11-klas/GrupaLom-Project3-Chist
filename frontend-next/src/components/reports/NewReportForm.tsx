"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createReport } from "@/lib/actions/reports";
import { SOFIA_CENTER, clampLat, clampLng, formatCoords } from "@/lib/geo";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-xl border border-brand-border bg-bg-card grid place-items-center text-text-3 text-sm">
      Loading map…
    </div>
  ),
});

export function NewReportForm() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const t = useTranslations("NewReport");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // [lng, lat] = SOFIA_CENTER → default to Sofia center.
  const [lat, setLat] = useState(SOFIA_CENTER[1]);
  const [lng, setLng] = useState(SOFIA_CENTER[0]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError(t("locationError"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(clampLat(pos.coords.latitude));
        setLng(clampLng(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setError(t("locationError"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createReport(fd);
      router.push(`/${locale}/reports`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failure"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" className="text-text-2 text-xs uppercase tracking-wider">{t("description")}</Label>
        <Textarea id="description" name="description" required rows={4} placeholder={t("descriptionPlaceholder")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-text-2 text-xs uppercase tracking-wider">{t("pickLocation")}</Label>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-xs text-accent-pink hover:text-pink-light disabled:opacity-50 transition"
          >
            <LocateFixed size={14} />
            {locating ? t("locating") : t("useMyLocation")}
          </button>
        </div>
        <LocationPicker lat={lat} lng={lng} onChange={(nLat, nLng) => { setLat(nLat); setLng(nLng); }} />
        <div className="text-text-3 text-xs flex items-center justify-between">
          <span>{t("pickLocationHint")}</span>
          <span className="text-text-2">{formatCoords(lat, lng)}</span>
        </div>
        <input type="hidden" name="latitude" value={lat} readOnly />
        <input type="hidden" name="longitude" value={lng} readOnly />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="severity" className="text-text-2 text-xs uppercase tracking-wider">{t("severity")}</Label>
        <select id="severity" name="severity" className="h-9 rounded-md border border-brand-border bg-bg-input text-text-1 px-3 text-sm" defaultValue="medium">
          <option value="critical">{t("severityCritical")}</option>
          <option value="high">{t("severityHigh")}</option>
          <option value="medium">{t("severityMedium")}</option>
          <option value="low">{t("severityLow")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo" className="text-text-2 text-xs uppercase tracking-wider">{t("photo")}</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" />
      </div>

      {error && <p className="text-status-red text-sm">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
