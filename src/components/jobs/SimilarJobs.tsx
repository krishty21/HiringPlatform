"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Briefcase, MapPin, ArrowRight, Compass } from "lucide-react";
import type { WorkerJobCardData } from "@/components/worker/JobCard";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";

interface SimilarJobsProps {
  currentJobId: string;
  tradeId: string | null;
  city: string;
  /** Optional current employer id — used to avoid showing more jobs from
   *  the same employer in the "Similar jobs" rail (cross-employer discovery). */
  currentEmployerId?: string;
  limit?: number;
}

// Round 11: Similar-jobs discovery rail on the job detail page.
// Reuses the frozen GET /api/jobs feed (no new route). Fetches a wider page
// (pageSize=50, distanceKm=200) once and client-side picks the top N by:
//  1) Same trade as the current job
//  2) Exclude the current job and any from the same employer (avoid self-promo)
//  3) Order by match score desc, then by wage, then by recency
//  4) Fall back to same-city jobs if the same-trade pool is too shallow.
// Renders a horizontal scroll rail on mobile / responsive grid on sm+.
//
// r15 anti-AI-slop cleanup: removed motion stagger, Sparkles icon,
// gradient hairlines, hover:-translate-y-0.5 transform, color-only Badge
// tones (emerald/rose/amber). Replaced with semantic dl rows, status-dot,
// surface-raised panels, neutral hover bg.
export function SimilarJobs({ currentJobId, tradeId, city, currentEmployerId, limit = 3 }: SimilarJobsProps) {
  const { t, lang } = useLanguage();
  const [jobs, setJobs] = useState<WorkerJobCardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Wide browse-all fetch — pageSize 50 covers the seeded demo catalogue.
        const res = await fetch(`/api/jobs?pageSize=50&distanceKm=200`, { cache: "no-store" });
        if (!res.ok) { if (!cancelled) setJobs([]); return; }
        const data = (await res.json()) as { items: WorkerJobCardData[] };
        if (cancelled) return;

        // Drop the current job + jobs from the same employer (cross-employer discovery).
        // If the pool is too thin without the same-employer filter, we'll fall back below.
        const otherEmployers = (data.items ?? []).filter(j =>
          j.id !== currentJobId && (!currentEmployerId || j.employer?.id !== currentEmployerId)
        );
        const includeSelf = (data.items ?? []).filter(j =>
          j.id !== currentJobId && currentEmployerId && j.employer?.id === currentEmployerId
        );

        // Sort helper — match desc → wage desc → newest.
        const byScore = (a: WorkerJobCardData, b: WorkerJobCardData) => {
          const am = a.matchScore ?? -1, bm = b.matchScore ?? -1;
          if (bm !== am) return bm - am;
          if (b.wageMax !== a.wageMax) return b.wageMax - a.wageMax;
          return +new Date(b.createdAt) - +new Date(a.createdAt);
        };

        // Three priority buckets — same-trade, same-city (any trade), other-city.
        // Same-employer fallback goes strictly last regardless of score.
        const sameTradeOtherEmployer = tradeId
          ? otherEmployers.filter(j => j.tradeId === tradeId).sort(byScore)
          : [];
        const sameCityOtherEmployer = otherEmployers
          .filter(j => j.city === city && !sameTradeOtherEmployer.some(s => s.id === j.id))
          .sort(byScore);
        const otherLocationOtherEmployer = otherEmployers
          .filter(j =>
            !sameTradeOtherEmployer.some(s => s.id === j.id) &&
            !sameCityOtherEmployer.some(s => s.id === j.id))
          .sort(byScore);
        const sameEmployerFallback = includeSelf
          .filter(j =>
            !sameTradeOtherEmployer.some(s => s.id === j.id) &&
            !sameCityOtherEmployer.some(s => s.id === j.id) &&
            !otherLocationOtherEmployer.some(s => s.id === j.id))
          .sort(byScore);

        const ordered = [
          ...sameTradeOtherEmployer,
          ...sameCityOtherEmployer,
          ...otherLocationOtherEmployer,
          ...sameEmployerFallback,
        ];

        setJobs(ordered.slice(0, limit));
      } catch {
        if (!cancelled) setJobs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [currentJobId, tradeId, city, currentEmployerId, limit]);

  if (jobs === null) {
    // Skeleton — 3 placeholder rows matching the final layout.
    return (
      <section className="flex flex-col gap-3" aria-label={t("jobSimilarTitle")} aria-busy="true">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            {t("jobSimilarTitle")}
          </h2>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="surface-raised rounded-md p-3 flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return (
      <section className="flex flex-col gap-3" aria-label={t("jobSimilarTitle")}>
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            {t("jobSimilarTitle")}
          </h2>
        </header>
        <div className="surface-inset rounded-md p-4 text-meta text-ink-muted flex items-center gap-2">
          <Briefcase className="size-4 shrink-0" aria-hidden />
          {t("jobSimilarEmpty")}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label={t("jobSimilarTitle")}>
      <header className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          {t("jobSimilarTitle")}
        </h2>
        <p className="text-meta text-ink-muted">
          {tradeId ? t("jobSimilarSubtitle") : t("jobSimilarSubtitleCity", { city })}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {jobs.map((job) => {
          const tradeName = job.trade
            ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
            : null;
          const score = job.matchScore;
          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="group surface-raised rounded-md p-3.5 flex flex-col gap-2 hover:bg-surface-sunken transition-colors"
              aria-label={`${job.title} — ${t("jobSimilarView")}`}
            >
              {/* Urgent indicator — small accent spine instead of color badge */}
              {job.isUrgent && (
                <p className="text-meta font-semibold text-accent flex items-center gap-1.5">
                  <span className="status-dot is-warning" aria-hidden />
                  {t("feedUrgent")}
                </p>
              )}
              {/* Title + match score */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-tight line-clamp-2 text-ink-strong group-hover:text-primary transition-colors">
                  {job.title}
                </p>
                {score != null && <MatchScoreBadge score={score} size="sm" />}
              </div>
              {/* Trade + distance row — semantic dl */}
              <dl className="flex items-center gap-1.5 flex-wrap text-meta text-ink-muted">
                {tradeName && (
                  <div className="inline-flex items-center gap-1">
                    <Briefcase className="size-3" aria-hidden />
                    <dt>{tradeName}</dt>
                  </div>
                )}
                {tradeName && <span aria-hidden>·</span>}
                <div className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden />
                  <dt>{job.city}</dt>
                  {job.distanceKm != null && (
                    <dd className="tabular-nums">· {job.distanceKm.toFixed(0)} {t("km")}</dd>
                  )}
                </div>
              </dl>
              {/* Employer */}
              {job.employer && (
                <p className="text-meta text-ink-subtle flex items-center gap-1.5 truncate">
                  <Compass className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{job.employer.companyName}</span>
                  {job.employer.isVerified && (
                    <span className="status-dot is-positive shrink-0" aria-hidden />
                  )}
                </p>
              )}
              {/* Wage row */}
              <div className="flex items-center justify-between gap-2 mt-auto pt-1.5 border-t border-border">
                <span className="text-sm font-semibold tabular-nums text-ink">
                  ₹{job.wageMin}–₹{job.wageMax}
                  <span className="text-meta text-ink-subtle font-normal ml-1">{t("perDay")}</span>
                </span>
                <ArrowRight
                  className="size-3.5 text-ink-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  aria-hidden
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
