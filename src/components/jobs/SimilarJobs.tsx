"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Zap, Sparkles, ArrowRight, Building2 } from "lucide-react";
import type { WorkerJobCardData } from "@/components/worker/JobCard";

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
    // Skeleton — 3 placeholder cards matching the final layout.
    return (
      <section className="flex flex-col gap-3" aria-label={t("jobSimilarTitle")} aria-busy="true">
        <header className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("jobSimilarTitle")}
          </h2>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="border-border/70">
              <CardContent className="p-4 flex flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return (
      <section className="flex flex-col gap-3" aria-label={t("jobSimilarTitle")}>
        <header className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("jobSimilarTitle")}
          </h2>
        </header>
        <Card className="border-dashed border-border">
          <CardContent className="p-4 text-xs text-muted-foreground flex items-center gap-2">
            <Briefcase className="size-4 shrink-0" aria-hidden />
            {t("jobSimilarEmpty")}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label={t("jobSimilarTitle")}>
      <header className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("jobSimilarTitle")}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {tradeId ? t("jobSimilarSubtitle") : t("jobSimilarSubtitleCity", { city })}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {jobs.map((job, i) => {
          const tradeName = job.trade
            ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
            : null;
          const score = job.matchScore;
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 4) * 0.06, ease: "easeOut" }}
            >
              <Card className="group relative h-full overflow-hidden border-border/70 transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
                <Link
                  href={`/jobs/${job.id}`}
                  className="block h-full"
                  aria-label={`${job.title} — ${t("jobSimilarView")}`}
                >
                  <CardContent className="p-4 flex flex-col gap-2 h-full">
                    {/* gradient hairline */}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-0.5 ${job.isUrgent ? "bg-gradient-to-r from-accent to-rose-400" : "bg-gradient-to-r from-primary/40 to-primary/5"}`}
                    />
                    {/* Title + urgent */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {job.title}
                      </p>
                      {job.isUrgent && (
                        <Badge variant="outline" className="shrink-0 bg-accent/10 text-accent-foreground border-accent/40 text-[10px] px-1.5 py-0">
                          <Zap className="size-2.5" />
                          {t("feedUrgent")}
                        </Badge>
                      )}
                    </div>
                    {/* Meta */}
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      {tradeName && <span className="inline-flex items-center gap-1"><Briefcase className="size-3" />{tradeName}</span>}
                      {tradeName && <span aria-hidden>·</span>}
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{job.city}</span>
                      {job.distanceKm != null && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{job.distanceKm.toFixed(0)} {t("km")}</span>
                        </>
                      )}
                    </p>
                    {/* Employer */}
                    {job.employer && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <Building2 className="size-3 shrink-0" aria-hidden />
                        <span className="truncate">{job.employer.companyName}</span>
                        {job.employer.isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <span aria-hidden>·</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                              {t("feedVerifiedEmployer")}
                            </Badge>
                          </span>
                        )}
                      </p>
                    )}
                    {/* Footer: wage + score + arrow */}
                    <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                      <span className="text-xs font-semibold tabular-nums">
                        ₹{job.wageMin}–₹{job.wageMax}
                        <span className="text-muted-foreground font-normal text-[10px] ml-1">{t("perDay")}</span>
                      </span>
                      {score != null && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] tabular-nums px-1.5 ${
                            score >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : score >= 50 ? "bg-accent/15 text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t("jobSimilarMatchLabel", { score })}
                        </Badge>
                      )}
                      <ArrowRight className="size-3.5 text-muted-foreground ml-auto group-hover:translate-x-1 group-hover:text-primary transition-all" aria-hidden />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
