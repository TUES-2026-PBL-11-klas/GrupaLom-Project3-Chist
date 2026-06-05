"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

function Toggle({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-brand-border last:border-b-0">
      <div className="flex-1">
        <div className="text-text-1 text-sm">{label}</div>
        <div className="text-text-3 text-xs mt-0.5">{desc}</div>
      </div>
      <button
        onClick={onToggle}
        aria-pressed={value}
        className={`relative w-10 h-5 rounded-full transition ${value ? "bg-accent-pink" : "bg-brand-primary-dim"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-text-1 transition-all ${value ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function useStoredFlag(key: string, defaultOn: boolean) {
  const [v, setV] = useState(() => {
    if (typeof window === "undefined") return defaultOn;
    const stored = localStorage.getItem(key);
    return stored == null ? defaultOn : stored === "true";
  });
  const toggle = useCallback(() => {
    setV((prev) => {
      const next = !prev;
      localStorage.setItem(key, String(next));
      return next;
    });
  }, [key]);
  return [v, toggle] as const;
}

export function SettingsPanel() {
  const t = useTranslations("Profile.settings");
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const [notifs, toggleNotifs] = useStoredFlag("cw_notifs", true);
  const [gps, toggleGps] = useStoredFlag("cw_gps", true);
  const [emails, toggleEmails] = useStoredFlag("cw_emails", false);

  const logoutAction = logout.bind(null, locale);

  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4 animate-fade-up">
      <Toggle label={t("pushNotifs")} desc={t("pushNotifsDesc")} value={notifs} onToggle={toggleNotifs} />
      <Toggle label={t("gps")}        desc={t("gpsDesc")}        value={gps}    onToggle={toggleGps} />
      <Toggle label={t("emails")}     desc={t("emailsDesc")}     value={emails} onToggle={toggleEmails} />
      <form action={logoutAction} className="mt-4">
        <Button type="submit" variant="destructive" className="w-full">{t("logout")}</Button>
      </form>
    </div>
  );
}
