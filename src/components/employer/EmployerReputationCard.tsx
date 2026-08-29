"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "@/components/ratings/RatingStars";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Star, Loader2, ShieldCheck, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RatingSummaryData {
  avg: number;
  count: number;
  breakdown: { score: number; count: number }[];
}

// Same thresholds as TopRatedBadge / candidates search (round 8).
const TOP_EMPLOYER_MIN_AVG = 4.5;
const TOP_EMPLOYER_MIN_COUNT = 3;

export function EmployerReputationCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<RatingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ratings/employer/self", { cache: "no-store" });
      if (res.ok) {
        setSummary(await res.json());
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  if (loading) {
    return (
      <Card className={cn("border-amber-500/20", className)}>
        <CardContent className="p-5 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  const count = summary?.count ?? 0;
  const avg = summary?.avg ?? 0;
  const breakdown = summary?.breakdown ?? [];
  const isTopEmployer = count >= TOP_EMPLOYER_MIN_COUNT && avg >= TOP_EMPLOYER_MIN_AVG;
  const max = Math.max(...breakdown.map(b => b.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={className}
    >
      <Card
        className={cn(
          "relative overflow-hidden border-amber-500/30",
          isTopEmployer
            ? "bg-gradient-to-br from-amber-50/60 via-card to-amber-50/30 dark:from-amber-950/20 dark:to-amber-950/5"
            : "bg-gradient-to-br from-amber-50/20 via-card to-card dark:from-amber-950/10",
        )}
      >
        {/* Decorative corner glow */}
        <div
          aria-hidden
          className="absolute -right-12 -top-12 size-44 rounded-full bg-amber-400/10 blur-3xl"
        />
        {/* Top gradient hairline for top employers */}
        {isTopEmployer && (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"
          />
        )}

        <CardHeader className="pb-3 relative">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
                <Star className="size-4 text-amber-500 fill-amber-400" />
              </span>
              {t("employerRepTitle")}
            </span>
            {isTopEmployer && (
              <motion.span
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
              >
                <ShieldCheck className="size-3" />
                {t("employerRepTopBadge")}
              </motion.span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="relative flex flex-col gap-4">
          {count === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("employerRepEmptyBody")}
              </p>
              <div className="rounded-lg border border-dashed border-amber-300/60 bg-amber-50/40 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="size-3.5" />
                  {t("employerRepCtaTitle")}
                </p>
                <p className="mt-1 text-amber-700/80 dark:text-amber-200/70">
                  {t("employerRepCtaBody")}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5 self-start border-amber-300/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/40"
              >
                <Link href="/employer/pipeline">
                  {t("employerRepCtaButton")}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Big avg + stars */}
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold tabular-nums leading-none text-amber-600 dark:text-amber-400">
                  {avg.toFixed(1)}
                </div>
                <div className="flex flex-col gap-1.5">
                  <RatingStars value={avg} readOnly size="sm" />
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {count === 1 ? t("workerFromOne") : t("workerFromMany", { count })}
                  </p>
                </div>
              </div>

              {/* Breakdown bars */}
              <div className="flex flex-col gap-1.5">
                {breakdown.map((b, idx) => (
                  <div key={b.score} className="flex items-center gap-2 text-xs">
                    <span className="w-3 font-medium tabular-nums">{b.score}</span>
                    <Star className="size-3 text-amber-500 fill-amber-400" />
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(b.count / max) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.1 + idx * 0.05, ease: "easeOut" }}
                        className="h-full bg-amber-400 rounded-full"
                      />
                    </div>
                    <span className="w-5 text-right text-muted-foreground tabular-nums">
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA / Nudge */}
              {!isTopEmployer && (
                <div className="rounded-lg border border-amber-300/50 bg-amber-50/40 p-3 dark:bg-amber-950/15">
                  <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                    <TrendingUp className="size-3.5 mt-0.5 shrink-0" />
                    <span>
                      {TOP_EMPLOYER_MIN_COUNT - count === 1
                        ? t("repNudgeOne")
                        : t("repNudgeMany", {
                            needed: Math.max(0, TOP_EMPLOYER_MIN_COUNT - count),
                          })}
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
