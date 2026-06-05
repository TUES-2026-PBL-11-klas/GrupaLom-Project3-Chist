import { reportsApi, usersApi, isUnauthorized } from "@/lib/api";
import { mapApiReport, mapApiUser, type Report, type User } from "@/lib/api/mappers";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { redirect } from "next/navigation";

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  let reports: Report[] = [];
  let user: User | null = null;
  try {
    const [rawReports, rawUser] = await Promise.all([
      reportsApi.list() as Promise<Record<string, unknown>[]>,
      usersApi.getMe().catch(() => null) as Promise<Record<string, unknown> | null>,
    ]);
    reports = (rawReports ?? []).map(mapApiReport);
    user = rawUser ? mapApiUser(rawUser) : null;
  } catch (err) {
    if (isUnauthorized(err)) {
      redirect(`/${locale}/login`);
    }
    // For other errors, show an empty list — better than crashing the page.
  }

  return <ReportsClient initialReports={reports} user={user} locale={locale} />;
}
