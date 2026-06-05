"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Leaf, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Navbar() {
  const t = useTranslations("Nav");
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";
  const pathname = usePathname();

  const links = [
    { href: `/${locale}/reports`, label: t("reports") },
    { href: `/${locale}/leaderboard`, label: t("leaderboard") },
    { href: `/${locale}/rewards`, label: t("rewards") },
    { href: `/${locale}/profile`, label: t("profile") },
  ];

  const logoutAction = logout.bind(null, locale);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-bg-base/80 backdrop-blur">
      <nav className="flex h-16 items-center justify-between gap-6 px-6 lg:px-10">
        <Link href={`/${locale}/reports`} className="flex items-center gap-2">
          <span className="rounded-full bg-accent-pink-dim border border-accent-pink-border p-1.5 text-accent-pink">
            <Leaf size={16} strokeWidth={1.8} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="display-heading text-text-1 text-xl">CHIST</span>
            <span className="text-text-3 text-[9px] uppercase tracking-[0.3em] mt-0.5">Sofia · Beta</span>
          </span>
        </Link>

        <ul className="hidden md:flex flex-1 items-center justify-center gap-2 lg:gap-4">
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`px-4 py-2 rounded-md text-xs uppercase tracking-wider transition ${
                    active
                      ? "text-accent-pink bg-accent-pink-dim"
                      : "text-text-2 hover:text-text-1 hover:bg-brand-primary-dim"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/reports/new`}
            className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-accent-pink text-bg-base text-[0.8rem] font-medium hover:bg-pink-light transition"
          >
            <Plus size={14} strokeWidth={2} />
            {t("newReport")}
          </Link>
          <LocaleSwitcher />
          <form action={logoutAction}>
            <Button type="submit" size="sm" variant="ghost" className="gap-1.5">
              <LogOut size={14} />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </form>
        </div>
      </nav>
    </header>
  );
}
