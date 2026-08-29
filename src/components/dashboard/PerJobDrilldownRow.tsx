"use client";
// PerJobDrilldownRow — DSH-03 per-job detail row.
// Shows: title, applicants by stage (badges), total views, sparkline of score distribution.
// Click → expands to candidate list / links to /employer/pipeline?jobId=...
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Eye, Users, ArrowRight, Zap } from "lucide-react";
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

const STAGE_TONES: Record<string, string> = {
  applied: "bg-blue-100 text-blue-800 border-blue-200",
  shortlisted: "bg-amber-100 text-amber-800 border-amber-200",
  interview: "bg-orange-100 text-orange-800 border-orange-200",
  offer: "bg-violet-100 text-violet-800 border-violet-200",
  hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
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
        "border transition-shadow",
        open ? "shadow-md" : "shadow-sm hover:shadow-sm",
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
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {job.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalApps === 1 ? t("dashApplicantOne") : t("dashApplicantMany", { count: totalApps })}
              {" · "}{job.status === "closed" ? t("myJobsStatusClosed") : t("myJobsStatusOpen")}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="size-3.5" />
            <span className="tabular-nums">{job.views}</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {stages.map(([stage, n]) =>
              n > 0 ? (
                <Badge
                  key={stage}
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 tabular-nums", STAGE_TONES[stage])}
                  title={t(STAGE_LABEL_KEYS[stage] ?? "trackerStageApplied")}
                >
                  {stage[0].toUpperCase()}{n}
                </Badge>
              ) : null,
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {open && (
          <div
            id={`job-${job.jobId}-detail`}
            className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {/* Applicants by stage (full labels) */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("dashApplicantsByStage")}
              </p>
              <div className="flex flex-col gap-1.5">
                {stages.map(([stage, n]) => (
                  <div key={stage} className="flex items-center justify-between text-xs">
                    <span>{t(STAGE_LABEL_KEYS[stage] ?? "trackerStageApplied")}</span>
                    <span className="tabular-nums font-semibold">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Views + total */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("dashViewsApplicants")}</p>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="size-4 text-muted-foreground" />
                <span className="tabular-nums font-semibold">{job.views}</span>
                <span className="text-muted-foreground">{t("dashFunnelViews").toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-muted-foreground" />
                <span className="tabular-nums font-semibold">{totalApps}</span>
                <span className="text-muted-foreground">{t("myJobsApplicants")}</span>
              </div>
            </div>

            {/* Score distribution sparkline */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("dashScoreDist")}</p>
              <ScoreDistributionSparkline distribution={job.scoreDistribution} />
              <p className="text-[10px] text-muted-foreground">{t("dashScoreBuckets")}</p>
            </div>

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
