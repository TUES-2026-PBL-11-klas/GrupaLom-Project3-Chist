"use client";

import { useTranslations } from "next-intl";

const WEEK_DATA = [
  [2, 5, 1, 3, 6, 4, 2],
  [4, 3, 7, 2, 5, 8, 3],
  [1, 6, 3, 5, 2, 4, 7],
  [5, 3, 6, 4, 7, 2, 5],
];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const CHART_MAX = Math.max(...WEEK_DATA.flat());

export function ActivityChart() {
  const t = useTranslations("Profile.activity");
  return (
    <div className="rounded-xl border border-brand-border bg-bg-card p-4 animate-fade-up">
      <div className="text-text-3 text-xs uppercase tracking-wider mb-3">{t("last4weeks")}</div>
      <div className="flex flex-col gap-1.5">
        {WEEK_DATA.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((val, di) => (
              <div key={di} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: Math.max(4, (val / CHART_MAX) * 44),
                    background: `rgba(255,255,255,${val > 0 ? 0.1 + (val / CHART_MAX) * 0.5 : 0.04})`,
                    border: `1px solid rgba(255,255,255,${val > 0 ? 0.2 : 0.07})`,
                  }}
                />
                {wi === WEEK_DATA.length - 1 && (
                  <span className="text-text-3 text-[0.625rem]">{t(`days.${DAY_KEYS[di]}`)}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
