"use client";
// PerJobDrilldownRow — DSH-03 per-job detail row.
// Per Master Prompt §31/§32: avoid decorative analytics; color + shape (status-dot)
// instead of color-only badges; semantic dl/dt/dd on expand.
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Eye, Users, ArrowRight } from "lucide-react";
import { ScoreDistributionSparkline } from "./ScoreDistributionSparkline";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export interface PerJob {
  jobId: string;
  title: string;
  status: string;
  applicantsByStage: {
    applied: number;
    shortlisted: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
  };
  views: number;
  scoreDistribution: number[]; // length 5
}

// Stage → status-dot class (color + shape, never color alone).
const STAGE_DOT: Record<string, string> = {
  applied: "is-info",
  shortlisted: "is-warning",
  interview: "is-info",
  offer: "is-warning",
  hired: "is-positive",
  rejected: "is-error",
};

// Localized full stage names (tracker keys shared with the pipeline + tracker)
const STAGE_LABEL_KEYS: Record<
  string,
  "trackerStageApplied" | "trackerStageShortlisted" | "trackerStageInterview" | "trackerStageOffer" | "trackerStageHired" | "trackerStageRejected"
> = {
  applied: "trackerStageApplied",
  shortlisted: "trackerStageShortlisted",
  interview: "trackerStageInterview",
  offer: "trackerStageOffer",
  hired: "trackerStageHired",
  rejected: "trackerStageRejected",
};

export function PerJobDrilldownRow({ job }: { job: PerJob }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const stages = Object.entries(job.applicantsByStage) as [string, number][];
  const totalApps = stages.reduce((acc, [, n]) => acc + n, 0);

  return (
    <Card
      className={cn(
        "surface-raised shadow-raise transition-colors",
        open ? "border-ink/30" : "hover:border-ink/30",
      )}
    >
      <CardContent className="p-4">
        {/* Header row — clickable */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 text-left min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          aria-expanded={open}
          aria-controls={`job-${job.jobId}-detail`}
        >
          {open ? (
            <ChevronDown className="size-4 text-ink-subtle shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-ink-subtle shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate text-ink">
              {job.title}
            </p>
            <p className="text-meta mt-0.5 text-ink-subtle">
              {totalApps === 1 ? t("dashApplicantOne") : t("dashApplicantMany", { count: totalApps })}
              {" · "}{job.status === "closed" ? t("myJobsStatusClosed") : t("myJobsStatusOpen")}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-meta text-ink-subtle">
            <Eye className="size-3.5" aria-hidden />
            <span className="tabular-nums">{job.views}</span>
          </div>
          <ul className="flex items-center gap-2 flex-wrap justify-end" aria-label={t("dashApplicantsByStage")}>
            {stages.map(([stage, n]) =>
              n > 0 ? (
                <li
                  key={stage}
                  className="inline-flex items-center gap-1 text-meta tabular-nums border border-border rounded px-1.5 py-0.5 bg-surface"
                  title={t(STAGE_LABEL_KEYS[stage] ?? "trackerStageApplied")}
                >
                  <span className={cn("status-dot", STAGE_DOT[stage])} aria-hidden />
                  {stage[0].toUpperCase()}{n}
                </li>
              ) : null,
            )}
          </ul>
        </button>

        {/* Expanded detail — semantic dl */}
        {open && (
          <div
            id={`job-${job.jobId}-detail`}
            className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {/* Applicants by stage (full labels) */}
            <dl className="space-y-1.5">
              <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                {t("dashApplicantsByStage")}
              </dt>
              <div className="flex flex-col gap-1.5">
                {stages.map(([stage, n]) => (
                  <dd key={stage} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("status-dot", STAGE_DOT[stage])} aria-hidden />
                      {t(STAGE_LABEL_KEYS[stage] ?? "trackerStageApplied")}
                    </span>
                    <span className="tabular-nums font-semibold text-ink">{n}</span>
                  </dd>
                ))}
              </div>
            </dl>

            {/* Views + total */}
            <dl className="space-y-1.5">
              <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                {t("dashViewsApplicants")}
              </dt>
              <dd className="flex items-center gap-2 text-sm">
                <Eye className="size-4 text-ink-subtle" aria-hidden />
                <span className="tabular-nums font-semibold text-ink">{job.views}</span>
                <span className="text-ink-subtle">{t("dashFunnelViews").toLowerCase()}</span>
              </dd>
              <dd className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-ink-subtle" aria-hidden />
                <span className="tabular-nums font-semibold text-ink">{totalApps}</span>
                <span className="text-ink-subtle">{t("myJobsApplicants")}</span>
              </dd>
            </dl>

            {/* Score distribution sparkline */}
            <dl className="space-y-1.5">
              <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                {t("dashScoreDist")}
              </dt>
              <dd>
                <ScoreDistributionSparkline distribution={job.scoreDistribution} />
              </dd>
              <dd className="text-[10px] text-ink-subtle">{t("dashScoreBuckets")}</dd>
            </dl>

            {/* CTA → pipeline Kanban with this job pre-selected */}
            <div className="sm:col-span-3 flex justify-end">
              <Button asChild size="sm" variant="outline" className="gap-2 min-h-9">
                <Link href={`/employer/pipeline?jobId=${job.jobId}`}>
                  {t("navPipeline")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
