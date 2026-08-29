"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  Loader2, ShieldCheck, IdCard, Award, Trophy, Sparkles, ArrowRight, Check, Clock,
} from "lucide-react";
import { motion } from "framer-motion";
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
  new: Sparkles,
  id_verified: IdCard,
  skill_verified: Award,
  top_pro: Trophy,
};

const TIER_COLOR: Record<TimelineEvent["tier"], string> = {
  new: "text-muted-foreground border-muted bg-muted/30",
  id_verified: "text-sky-700 border-sky-300/60 bg-sky-50/60 dark:text-sky-300 dark:border-sky-700/40 dark:bg-sky-950/20",
  skill_verified: "text-emerald-700 border-emerald-300/60 bg-emerald-50/60 dark:text-emerald-300 dark:border-emerald-700/40 dark:bg-emerald-950/20",
  top_pro: "text-amber-700 border-amber-300/60 bg-amber-50/70 dark:text-amber-300 dark:border-amber-700/40 dark:bg-amber-950/20",
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
        <CardContent className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (!history || history.events.length <= 1 && history.currentTier === "new") {
    // Edge case: brand-new worker with no events at all. Show empty state with CTA.
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" />
            {t("trustTimelineTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("trustTimelineEmpty")}</p>
          <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5 min-h-11">
            <Link href="/verify">{t("trustTimelineViewVerify")}<ArrowRight className="size-3.5" /></Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const events = history.events;
  const upNext = history.upNext.tier;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Subtle hairline gradient */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30" />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-primary" />
          {t("trustTimelineTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-0 ml-3">
          {/* Vertical rail */}
          <div
            aria-hidden
            className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/40 via-border to-transparent"
          />

          {events.map((ev, idx) => {
            const Icon = TIER_ICON[ev.tier];
            const isLast = idx === events.length - 1;
            const isCurrent = ev.tier === history.currentTier && !isLast ? false : isLast && history.currentTier === ev.tier;
            return (
              <motion.li
                key={`${ev.type}-${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.08, ease: "easeOut" }}
                className="relative pl-6 pb-5 last:pb-0"
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 size-3.5 rounded-full border-2 grid place-items-center",
                    TIER_COLOR[ev.tier],
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("size-3.5", TIER_COLOR[ev.tier].split(" ")[0])} />
                    <span className="text-sm font-semibold">
                      {ev.type === "start" ? t("trustTimelineStart")
                        : ev.tier === "id_verified" ? t("trustTimelineIdVerified")
                        : ev.tier === "skill_verified" ? t("trustTimelineSkillVerified")
                        : t("trustTimelineTopPro")}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-primary">
                        <Check className="size-2.5" />
                        {t("trustTimelineNow")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ev.type === "start" ? t("trustTimelineStartDesc")
                      : ev.tier === "id_verified" ? t("trustTimelineIdVerifiedDesc")
                      : ev.tier === "skill_verified" ? t("trustTimelineSkillVerifiedDesc")
                      : t("trustTimelineTopProDesc")}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 tabular-nums mt-0.5">
                    {formatDate(ev.at, isCurrent)}
                  </p>
                </div>
              </motion.li>
            );
          })}

          {/* Up-next card */}
          {upNext && (
            <motion.li
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: events.length * 0.08, ease: "easeOut" }}
              className="relative pl-6"
            >
              <span
                aria-hidden
                className="absolute left-0 top-1 size-3.5 rounded-full border-2 border-dashed border-muted-foreground/40 grid place-items-center"
              >
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              </span>
              <div className="mt-1 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("trustTimelineUpnext")}
                </p>
                <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  {upNext === "id_verified" ? t("trustTimelineUpnextId")
                    : upNext === "skill_verified" ? t("trustTimelineUpnextSkill")
                    : t("trustTimelineUpnextTop")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {upNext === "id_verified" ? t("trustTimelineUpnextIdDesc")
                    : upNext === "skill_verified" ? t("trustTimelineUpnextSkillDesc")
                    : t("trustTimelineUpnextTopDesc")}
                </p>
                {upNext !== "top_pro" && (
                  <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5 min-h-9 text-xs">
                    <Link href="/verify">
                      {t("trustTimelineViewVerify")}
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </motion.li>
          )}
        </ol>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string, isCurrent: boolean): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}
