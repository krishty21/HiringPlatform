"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  Loader2, ShieldCheck, IdCard, Award, Trophy, ArrowRight, Check, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TimelineEvent {
  type: "start" | "verified" | "top_pro";
  at: string;
  tier: "new" | "id_verified" | "skill_verified" | "top_pro";
  docType?: string;
}
interface TrustHistory {
  events: TimelineEvent[];
  currentTier: "new" | "id_verified" | "skill_verified" | "top_pro";
  upNext: { tier: "id_verified" | "skill_verified" | "top_pro" | null };
}

const TIER_ICON: Record<TimelineEvent["tier"], React.ComponentType<{ className?: string }>> = {
  new: Clock,
  id_verified: IdCard,
  skill_verified: Award,
  top_pro: Trophy,
};

// Use the new tier token colors via inline styles, not sky-50/emerald-50/amber-50.
// .is-positive / .is-info / .is-warning / .is-neutral map to the new palette.
const TIER_DOT: Record<TimelineEvent["tier"], string> = {
  new: "is-neutral",
  id_verified: "is-info",
  skill_verified: "is-positive",
  top_pro: "is-warning",
};

export function TrustTimeline({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState<TrustHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/worker/trust-history", { cache: "no-store" });
      if (res.ok) setHistory(await res.json());
      else setHistory(null);
    } catch {
      setHistory(null);
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
      <Card className={cn(className)}>
        <CardContent className="p-5 flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (!history || (history.events.length <= 1 && history.currentTier === "new")) {
    // Edge case: brand-new worker with no events. Show empty state with CTA.
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-ink-muted" aria-hidden />
            {t("trustTimelineTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-muted">{t("trustTimelineEmpty")}</p>
          <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5 min-h-11">
            <Link href="/verify">
              {t("trustTimelineViewVerify")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const events = history.events;
  const upNext = history.upNext.tier;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-ink-muted" aria-hidden />
          {t("trustTimelineTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 ml-3">
          {/* vertical rail */}
          <span
            aria-hidden
            className="absolute left-[7px] top-2 bottom-2 w-px bg-border"
          />

          {events.map((ev, idx) => {
            const Icon = TIER_ICON[ev.tier];
            const isLast = idx === events.length - 1;
            const isCurrent = ev.tier === history.currentTier && !isLast ? false : isLast && history.currentTier === ev.tier;
            return (
              <li
                key={`${ev.type}-${idx}`}
                className="relative pl-6 last:pb-0"
              >
                <span
                  className={cn(
                    "absolute left-0 top-0.5 size-3.5 rounded-full border-2 grid place-items-center bg-surface",
                    isCurrent ? "border-accent" : "border-border",
                  )}
                  aria-hidden
                >
                  <span className={`size-1.5 rounded-full status-dot ${TIER_DOT[ev.tier]}`} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Icon className="size-3.5 text-ink-muted" aria-hidden />
                    <span className="text-sm font-semibold text-ink">
                      {ev.type === "start" ? t("trustTimelineStart")
                        : ev.tier === "id_verified" ? t("trustTimelineIdVerified")
                        : ev.tier === "skill_verified" ? t("trustTimelineSkillVerified")
                        : t("trustTimelineTopPro")}
                    </span>
                    {isCurrent && (
                      <span className="trust-pill is-verified">
                        <Check className="size-3" aria-hidden />
                        {t("trustTimelineNow")}
                      </span>
                    )}
                  </div>
                  <p className="text-meta text-ink-muted">
                    {ev.type === "start" ? t("trustTimelineStartDesc")
                      : ev.tier === "id_verified" ? t("trustTimelineIdVerifiedDesc")
                      : ev.tier === "skill_verified" ? t("trustTimelineSkillVerifiedDesc")
                      : t("trustTimelineTopProDesc")}
                  </p>
                  <p className="text-meta text-ink-subtle tabular-nums mt-0.5">
                    {formatDate(ev.at)}
                  </p>
                </div>
              </li>
            );
          })}

          {/* Up-next card — dashed, neutral */}
          {upNext && (
            <li className="relative pl-6">
              <span
                aria-hidden
                className="absolute left-0 top-1 size-3.5 rounded-full border-2 border-dashed border-ink-subtle/40 grid place-items-center"
              >
                <span className="size-1.5 rounded-full bg-ink-subtle/40" />
              </span>
              <div className="mt-1 surface-inset rounded-md p-3">
                <p className="text-meta font-semibold uppercase tracking-wide text-ink-subtle">
                  {t("trustTimelineUpnext")}
                </p>
                <p className="text-sm font-semibold text-ink mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-ink-muted" aria-hidden />
                  {upNext === "id_verified" ? t("trustTimelineUpnextId")
                    : upNext === "skill_verified" ? t("trustTimelineUpnextSkill")
                    : t("trustTimelineUpnextTop")}
                </p>
                <p className="text-meta text-ink-muted mt-0.5">
                  {upNext === "id_verified" ? t("trustTimelineUpnextIdDesc")
                    : upNext === "skill_verified" ? t("trustTimelineUpnextSkillDesc")
                    : t("trustTimelineUpnextTopDesc")}
                </p>
                {upNext !== "top_pro" && (
                  <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5 min-h-9 text-xs">
                    <Link href="/verify">
                      {t("trustTimelineViewVerify")}
                      <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          )}
        </ol>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}
