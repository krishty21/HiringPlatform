"use client";
// /employer/dashboard — DSH-01 + DSH-03
// Headline metric: avg time-to-hire (huge numerals). StatCards: active jobs, new
// applicants today, hires this week. Funnel (Views→Applied→Shortlisted→Interview→Hired).
// Per-job drill-down rows: applicants by stage + views + score-distribution sparkline.
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { TimeToHireHeadline } from "@/components/dashboard/TimeToHireHeadline";
import { PerJobDrilldownRow, type PerJob } from "@/components/dashboard/PerJobDrilldownRow";
import { LayoutDashboard, Briefcase, UserPlus, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";

interface DashboardData {
  timeToHireHours: number | null;
  activeJobs: number;
  newApplicantsToday: number;
  hiresThisWeek: number;
  funnel: {
    views: number;
    applied: number;
    shortlisted: number;
    interview: number;
    offer: number;
    hired: number;
  };
  perJob: PerJob[];
}

export default function EmployerDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/dashboard/employer", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const d = (await res.json()) as DashboardData;
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t("errGeneric"));
      }
    };
    setTimeout(load, 0);
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto">
        <header className="flex items-center gap-2">
          <LayoutDashboard className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("navDashboard")}</h1>
        </header>

        {/* Headline: avg time-to-hire (huge numerals) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
        <Card className="relative overflow-hidden">
          <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-primary/5 blur-2xl" />
          <CardContent className="relative p-6">
            {!data ? (
              <div className="h-16 w-72 bg-muted/40 rounded animate-pulse" />
            ) : (
              <TimeToHireHeadline hours={data.timeToHireHours} />
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* StatCards: 3-4 across on desktop, 2x2 on mobile */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {!data && !error
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl border bg-card animate-pulse" />
              ))
            : null}
          {data && (
            <>
              <StatCard
                label={t("dashActiveJobs")}
                value={data.activeJobs}
                icon={Briefcase}
                tone="default"
              />
              <StatCard
                label={t("dashNewApplicants")}
                value={data.newApplicantsToday}
                hint="Since UTC midnight"
                icon={UserPlus}
                tone="primary"
              />
              <StatCard
                label={t("dashHiresThisWeek")}
                value={data.hiresThisWeek}
                hint="Last 7 days"
                icon={ShieldCheck}
                tone="success"
              />
              <StatCard
                label={t("dashFunnelHired")}
                value={data.funnel.hired}
                hint="All-time total"
                icon={ShieldCheck}
                tone="default"
              />
            </>
          )}
        </section>

        {/* Funnel + per-job breakdown */}
        {error ? (
          <EmptyState title={t("errGeneric")} description={error} />
        ) : !data ? (
          <LoadingSkeleton count={2} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("dashFunnel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FunnelChart funnel={data.funnel} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pipeline snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <PipelineSummaryRow
                  label={t("dashFunnelApplied")}
                  value={data.funnel.applied}
                  max={data.funnel.applied}
                  tone="bg-primary"
                />
                <PipelineSummaryRow
                  label={t("dashFunnelShortlisted")}
                  value={data.funnel.shortlisted}
                  max={data.funnel.applied}
                  tone="bg-accent"
                />
                <PipelineSummaryRow
                  label={t("dashFunnelInterview")}
                  value={data.funnel.interview + data.funnel.offer}
                  max={data.funnel.applied}
                  tone="bg-orange-500"
                />
                <PipelineSummaryRow
                  label={t("dashFunnelHired")}
                  value={data.funnel.hired}
                  max={data.funnel.applied}
                  tone="bg-emerald-600"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Per-job drill-down (DSH-03) */}
        <section>
          <header className="mb-3">
            <h2 className="text-lg font-semibold tracking-tight">{t("dashPerJob")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any job to expand applicants-by-stage and score distribution.
            </p>
          </header>
          {!data ? (
            <LoadingSkeleton count={3} />
          ) : data.perJob.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={t("myJobsEmpty")}
              description="Post your first job to see per-job analytics here."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {data.perJob.map((j) => (
                <PerJobDrilldownRow key={j.jobId} job={j} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PipelineSummaryRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${tone}`} aria-hidden />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${tone}`}
        />
      </div>
    </div>
  );
}
