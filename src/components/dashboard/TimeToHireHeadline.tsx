"use client";
// TimeToHireHeadline — the "31.4 hrs" headline metric for the employer dashboard.
// Per Master Prompt §31: avoid decorative analytics. Big number + meta label, no glow.
import { Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function TimeToHireHeadline({ hours }: { hours: number | null }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-start gap-4">
      <div
        className="size-12 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0 border border-border"
        aria-hidden
      >
        <Clock className="size-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-meta uppercase tracking-wide text-ink-subtle">
          {t("dashTimeToHire")}
        </p>
        {hours === null ? (
          <>
            <p className="text-5xl font-bold tabular-nums leading-none mt-1 text-ink">—</p>
            <p className="text-meta mt-2 text-ink-subtle">
              {t("dashTimeToHireEmpty")}
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl font-bold tabular-nums leading-none mt-1 text-ink">
              {hours.toFixed(1)}
              <span className="text-2xl font-semibold text-ink-muted ml-2">{t("unitHours")}</span>
            </p>
            <p className="text-meta mt-2 text-ink-subtle">
              {t("dashTimeToHireHint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
