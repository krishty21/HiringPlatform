"use client";
// TimeToHireHeadline — the huge "31.4 hrs" metric for the employer dashboard.
// Renders null as "—" with a hint to hire the first candidate.
import { Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function TimeToHireHeadline({ hours }: { hours: number | null }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-start gap-4">
      <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Clock className="size-6" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("dashTimeToHire")}
        </p>
        {hours === null ? (
          <>
            <p className="text-5xl font-bold tabular-nums leading-none mt-1">—</p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("dashTimeToHireEmpty")}
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl font-bold tabular-nums leading-none mt-1">
              {hours.toFixed(1)}
              <span className="text-2xl font-semibold text-muted-foreground ml-2">{t("unitHours")}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("dashTimeToHireHint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
