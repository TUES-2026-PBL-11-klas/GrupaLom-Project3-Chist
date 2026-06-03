import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NewReportForm } from "@/components/reports/NewReportForm";

export default async function NewReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("NewReport");
  return (
    <main className="anim-fade-up max-w-xl mx-auto px-4 py-8 flex flex-col gap-6">
      <Link href={`/${locale}/reports`} className="text-text-3 text-xs uppercase tracking-wider hover:text-text-1 flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> {t("back")}
      </Link>
      <div className="rounded-2xl border border-brand-border bg-bg-card p-6">
        <h1 className="display-heading text-text-1 text-xl mb-4">
          {t("title")}
        </h1>
        <NewReportForm />
      </div>
    </main>
  );
}
