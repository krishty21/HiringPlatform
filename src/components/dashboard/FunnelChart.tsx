"use client";
// FunnelChart — horizontal bars Views → Applied → Shortlisted → Interview → Hired.
// Pure CSS bars (no chart library); width = count / maxStageCount.
// Restrained per Master Prompt §32: solid ink tones, no gradients, no animations.
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

  // Solid tones — applied (navy) → shortlisted (warning) → interview (info)
  // → offer (warning stronger) → hired (positive). Each has a status-dot.
  const toneClass: Record<FunnelStage["key"], string> = {
    views: "bg-ink-subtle/40",
    applied: "bg-primary",
    shortlisted: "bg-accent/80",
    interview: "bg-info",
    hired: "bg-positive",
  };
  const dotClass: Record<FunnelStage["key"], string> = {
    views: "is-neutral",
    applied: "is-info",
    shortlisted: "is-warning",
    interview: "is-info",
    hired: "is-positive",
  };

  return (
    <ol className="flex flex-col gap-2.5" aria-label={t("dashFunnel")}>
      {stages.map((s) => {
        const pct = Math.max((s.value / max) * 100, 4); // min 4% so empty bars are still visible
        return (
          <li key={s.key} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-meta text-right flex items-center justify-end gap-1.5">
              <span className={cn("status-dot", dotClass[s.key])} aria-hidden />
              <span className="text-ink-muted">{t(s.labelKey)}</span>
            </div>
            <div className="flex-1 h-7 bg-surface-sunken rounded-sm overflow-hidden relative border border-border">
              <div
                className={cn("h-full rounded-sm", toneClass[s.key])}
                style={{ width: `${pct}%` }}
                role="img"
                aria-label={`${t(s.labelKey)}: ${s.value}`}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold tabular-nums text-ink">
                {s.value}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
