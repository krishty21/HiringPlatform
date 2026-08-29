"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "@/components/ratings/RatingStars";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Loader2, ShieldCheck, TrendingUp, Award, ArrowRight } from "lucide-react";
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

/**
 * EmployerReputationCard — per Master Prompt §31/§32.
 * Restrained metric panel: big avg + stars + breakdown bars.
 * Removed: motion entrance, decorative corner glow (blur-3xl), top gradient hairline,
 * amber-tinted card backgrounds, amber Sparkles icon on the CTA.
 * Added: surface-raised + shadow-raise, status-dot on top-employer pill, ink-only bar
 * tones, surface-inset on the empty-state CTA.
 */
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
      <Card className={cn("surface-raised", className)}>
        <CardContent className="p-5 flex items-center gap-3 text-sm text-ink-subtle">
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
    <Card
      className={cn(
        "surface-raised shadow-raise h-full",
        isTopEmployer ? "border-positive/30" : "",
        className,
      )}
    >
      {isTopEmployer && (
        <div aria-hidden className="h-0.5 w-full bg-positive" />
      )}
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <span
              className="inline-flex size-7 items-center justify-center rounded-md bg-accent/10 text-accent-foreground border border-border"
              aria-hidden
            >
              <Award className="size-4" />
            </span>
            <span className="text-ink">{t("employerRepTitle")}</span>
          </span>
          {isTopEmployer && (
            <span className="trust-pill is-verified inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden />
              {t("employerRepTopBadge")}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {count === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-muted">
              {t("employerRepEmptyBody")}
            </p>
            <div className="surface-inset rounded-md p-3 text-xs text-ink-muted">
              <p className="flex items-center gap-1.5 font-medium text-ink">
                <TrendingUp className="size-3.5" aria-hidden />
                {t("employerRepCtaTitle")}
              </p>
              <p className="mt-1 text-ink-subtle">
                {t("employerRepCtaBody")}
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5 self-start min-h-9"
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
              <div className="text-4xl font-bold tabular-nums leading-none text-ink">
                {avg.toFixed(1)}
              </div>
              <div className="flex flex-col gap-1.5">
                <RatingStars value={avg} readOnly size="sm" />
                <p className="text-meta tabular-nums text-ink-subtle">
                  {count === 1 ? t("workerFromOne") : t("workerFromMany", { count })}
                </p>
              </div>
            </div>

            {/* Breakdown bars */}
            <dl className="flex flex-col gap-1.5">
              {breakdown.map((b) => (
                <div key={b.score} className="flex items-center gap-2 text-xs">
                  <dt className="w-3 font-medium tabular-nums text-ink-muted">{b.score}</dt>
                  <div className="flex-1 h-2 rounded-full bg-surface-sunken overflow-hidden border border-border">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${(b.count / max) * 100}%` }}
                    />
                  </div>
                  <dd className="w-5 text-right text-ink-subtle tabular-nums">
                    {b.count}
                  </dd>
                </div>
              ))}
            </dl>

            {/* CTA / Nudge */}
            {!isTopEmployer && (
              <div className="surface-inset rounded-md p-3">
                <p className="flex items-start gap-1.5 text-xs text-ink-muted">
                  <TrendingUp className="size-3.5 mt-0.5 shrink-0 text-ink-subtle" aria-hidden />
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
  );
}
