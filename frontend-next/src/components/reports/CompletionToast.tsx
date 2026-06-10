"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useApp } from "@/context/AppContext";

/** Reads the `?earned=N` left by the complete-report server action, shows a
 *  success toast for the points awarded, then strips the param so a refresh
 *  doesn't re-fire it. Rendered on the report detail page. */
export function CompletionToast() {
  const params = useSearchParams();
  const earned = params.get("earned");
  const { pushNotification } = useApp();
  const t = useTranslations("ReportDetail");
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    if (!earned || fired.current) return;
    const n = Number(earned);
    if (!Number.isFinite(n) || n <= 0) return;
    fired.current = true;
    pushNotification({ type: "success", message: t("pointsEarned", { n }) });
    router.replace(pathname);
  }, [earned, pushNotification, t, router, pathname]);

  return null;
}
