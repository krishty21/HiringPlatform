"use client";
// FunnelChart — horizontal bars Views → Applied → Shortlisted → Interview → Hired.
// Pure CSS bars (no chart library); width = count / maxStageCount.
// Gradient: primary (left/top) → accent (right/bottom) on the largest bar; smaller bars stay solid primary.
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export interface FunnelStage {
  key: "views" | "applied" | "shortlisted" | "interview" | "hired";
  labelKey:
    | "dashFunnelViews"
    | "dashFunnelApplied"
    | "dashFunnelShortlisted"
    | "dashFunnelInterview"
    | "dashFunnelHired";
  value: number;
}

export function FunnelChart({ funnel }: { funnel: { views: number; applied: number; shortlisted: number; interview: number; offer: number; hired: number } }) {
  const { t } = useLanguage();
  const stages: FunnelStage[] = [
    { key: "views", labelKey: "dashFunnelViews", value: funnel.views },
    { key: "applied", labelKey: "dashFunnelApplied", value: funnel.applied },
    { key: "shortlisted", labelKey: "dashFunnelShortlisted", value: funnel.shortlisted },
    { key: "interview", labelKey: "dashFunnelInterview", value: funnel.interview + funnel.offer },
    { key: "hired", labelKey: "dashFunnelHired", value: funnel.hired },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="flex flex-col gap-3" aria-label={t("dashFunnel")}>
      {stages.map((s, i) => {
        const pct = Math.max((s.value / max) * 100, 4); // min 4% so empty bars are still visible
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-xs font-medium text-muted-foreground text-right">
              {t(s.labelKey)}
            </div>
            <div className="flex-1 h-8 bg-muted/40 rounded-md overflow-hidden relative">
              <div
                className={cn(
                  "h-full rounded-md transition-all duration-500",
                  i === 0
                    ? "bg-gradient-to-r from-primary to-accent"
                    : i === stages.length - 1
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-700"
                      : "bg-gradient-to-r from-primary/90 to-primary/60",
                )}
                style={{ width: `${pct}%` }}
                role="img"
                aria-label={`${t(s.labelKey)}: ${s.value}`}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold tabular-nums text-foreground">
                {s.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
