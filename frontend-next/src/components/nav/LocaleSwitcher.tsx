"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === locale) return;
    const segments = pathname.split("/");
    segments[1] = next;
    const target = segments.join("/") || `/${next}`;
    startTransition(() => router.replace(target));
  }

  return (
    <label className="flex items-center gap-1.5 text-text-2 text-xs">
      <Globe size={14} strokeWidth={1.8} />
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        value={locale}
        onChange={onChange}
        className="bg-transparent text-text-2 uppercase tracking-wider text-xs outline-none cursor-pointer hover:text-text-1"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} className="bg-bg-card text-text-1">
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
