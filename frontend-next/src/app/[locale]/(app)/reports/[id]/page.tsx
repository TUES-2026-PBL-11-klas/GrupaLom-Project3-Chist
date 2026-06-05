import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { reportsApi, isUnauthorized, ApiError } from "@/lib/api";
import { mapApiReport, type Report } from "@/lib/api/mappers";
import { claimReport, completeReport, confirmReport } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Flame, User } from "lucide-react";

const STATUS_KEY = { open: "open", "in-progress": "inProgress", done: "done" } as const;

export default async function ReportDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const tSev = await getTranslations("Severity");
  const tStatus = await getTranslations("Status");
  const tRD = await getTranslations("ReportDetail");

  let report: Report | null = null;
  try {
    const raw = (await reportsApi.getById(id)) as Record<string, unknown>;
    report = mapApiReport(raw);
  } catch (err) {
    if (isUnauthorized(err)) redirect(`/${locale}/login`);
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  if (!report) notFound();

  const claimAction = claimReport.bind(null, report.id);
  const completeWithEmpty = async () => {
    "use server";
    await completeReport(report.id, new FormData());
  };
  const confirmAction = confirmReport.bind(null, report.id);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <Link
        href={`/${locale}/reports`}
        className="text-text-3 text-xs uppercase tracking-wider hover:text-text-1 flex items-center gap-1.5 w-fit"
      >
        <ArrowLeft size={14} /> {tRD("back")}
      </Link>

      <div className="rounded-2xl border border-brand-border bg-bg-card p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-accent-pink uppercase tracking-widest text-xs flex items-center gap-1">
            <Flame size={12} /> {tSev(report.severity as "critical" | "high" | "medium" | "low")}
          </span>
          <span className="text-text-3 text-xs">{report.time}</span>
          <span className="ml-auto text-text-2 text-xs uppercase tracking-wider">{tStatus(STATUS_KEY[report.status])}</span>
        </div>
        <h1 className="text-text-1 text-2xl">{report.description}</h1>
        <div className="flex items-center gap-1.5 text-text-3 text-sm">
          <MapPin size={14} /> {report.district} · {report.location}
        </div>
        <div className="flex items-center gap-1.5 text-text-3 text-sm">
          <User size={14} /> {report.reporter || tRD("unknownReporter")}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {report.status === "open" && (
            <form action={claimAction}>
              <Button type="submit">{tRD("claim")}</Button>
            </form>
          )}
          {report.status === "in-progress" && (
            <form action={completeWithEmpty}>
              <Button type="submit">{tRD("markComplete")}</Button>
            </form>
          )}
          <form action={confirmAction}>
            <Button type="submit" variant="outline">
              {tRD("confirmSighting")}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
