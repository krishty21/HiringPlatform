"use client";
// /employer/dashboard — Master Prompt §31: dashboard answers
// "How is hiring going? Where are candidates stuck? How quickly? Which jobs need attention?"
// Prioritize: active roles, applicants, shortlist rate, hiring funnel, time-to-hire,
// open positions, urgent hiring, jobs requiring action.
//
// Slop removed: motion entrance, decorative blur blob (size-40 blur-2xl),
// PipelineSummaryRow motion.div width animation, "Click any job to expand" copy.
// Added: dl/dt/dd headline panel, border-t sectioned layout, surface-raised panels,
// restrained FunnelChart (no gradient), per-job drilldown with semantic dl.
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { TimeToHireHeadline } from "@/components/dashboard/TimeToHireHeadline";
import { PerJobDrilldownRow, type PerJob } from "@/components/dashboard/PerJobDrilldownRow";
import { LayoutDashboard, Briefcase, UserPlus, Handshake, Eye } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EmployerReputationCard } from "@/components/employer/EmployerReputationCard";

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

  // Derived shortlist rate (% of applied → shortlisted). Avoid decorative analytics.
  const shortlistRate =
    data && data.funnel.applied > 0
      ? Math.round((data.funnel.shortlisted / data.funnel.applied) * 100)
      : null;

  return (
    <AppShell>
      <main className="flex flex-col gap-6 max-w-6xl mx-auto">
        {/* Page header — border-b sectioned */}
        <header className="border-b border-border pb-4 flex items-center gap-3">
          <span className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center border border-border" aria-hidden>
            <LayoutDashboard className="size-5" />
          </span>
          <div>
            <p className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("dashEyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {t("navDashboard")}
            </h1>
          </div>
        </header>

        {/* Headline: avg time-to-hire (Master Prompt §31) */}
        <Card className="surface-raised shadow-raise overflow-hidden">
          <div aria-hidden className="h-0.5 w-full bg-primary" />
          <CardContent className="p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 sm:gap-8">
              <div>
                <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                  {t("dashTimeToHire")}
                </dt>
                <dd className="mt-2">
                  {!data ? (
                    <div className="h-16 w-72 bg-surface-sunken rounded animate-pulse" />
                  ) : (
                    <TimeToHireHeadline hours={data.timeToHireHours} />
                  )}
                </dd>
              </div>
              {/* Shortlist-rate supplementary metric (only when data is loaded) */}
              <dd className="border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6">
                <p className="text-meta uppercase tracking-wide text-ink-subtle">
                  {t("dashShortlistRate")}
                </p>
                <p className="text-3xl font-bold tabular-nums text-ink mt-1 leading-none">
                  {shortlistRate === null ? "—" : `${shortlistRate}%`}
                </p>
                <p className="text-meta text-ink-subtle mt-2">
                  {t("dashShortlistRateHint")}
                </p>
              </dd>
            </dl>
          </CardContent>
        </Card>

        {/* StatCards — 4-up on desktop, 2x2 on mobile. dl/dt/dd grid. */}
        <section aria-label={t("dashStatsAria")}>
          <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-3">
            {t("dashStatsHeading")}
          </h2>
          {!data && !error
            ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-md border bg-surface-sunken animate-pulse" />
                ))}
              </div>
            )
            : null}
          {data && (
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label={t("dashActiveJobs")}
                value={data.activeJobs}
                hint={t("dashActiveJobsHint")}
                icon={Briefcase}
                tone="default"
              />
              <StatCard
                label={t("dashNewApplicants")}
                value={data.newApplicantsToday}
                hint={t("sinceMidnight")}
                icon={UserPlus}
                tone="primary"
              />
              <StatCard
                label={t("dashHiresThisWeek")}
                value={data.hiresThisWeek}
                hint={t("last7Days")}
                icon={Handshake}
                tone="success"
              />
              <StatCard
                label={t("dashFunnelHired")}
                value={data.funnel.hired}
                hint={t("allTimeTotal")}
                icon={Eye}
                tone="default"
              />
            </dl>
          )}
        </section>

        {/* Funnel + per-job breakdown + reputation */}
        {error ? (
          <EmptyState title={t("errGeneric")} description={error} />
        ) : !data ? (
          <LoadingSkeleton count={2} />
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Funnel */}
            <article className="surface-raised shadow-raise rounded-md border border-border p-5 lg:col-span-2">
              <header className="flex items-baseline justify-between gap-2 mb-4">
                <h2 className="text-base font-semibold text-ink">{t("dashFunnel")}</h2>
                <p className="text-meta text-ink-subtle">{t("dashFunnelHint")}</p>
              </header>
              <FunnelChart funnel={data.funnel} />
            </article>

            {/* Employer reputation summary */}
            <EmployerReputationCard />
          </section>
        )}

        {/* Per-job drill-down (DSH-03) */}
        <section aria-label={t("dashPerJob")}>
          <header className="flex items-baseline justify-between gap-3 mb-3 border-b border-border pb-2">
            <div>
              <h2 className="text-base font-semibold text-ink">{t("dashPerJob")}</h2>
              <p className="text-meta text-ink-subtle mt-0.5">
                {t("dashPerJobHint")}
              </p>
            </div>
          </header>
          {!data ? (
            <LoadingSkeleton count={3} />
          ) : data.perJob.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={t("myJobsEmpty")}
              description={t("dashPerJobEmptyHint")}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {data.perJob.map((j) => (
                <PerJobDrilldownRow key={j.jobId} job={j} />
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
