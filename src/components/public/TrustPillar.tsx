"use client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { LucideIcon } from "lucide-react";

type PillarKey =
  | "landingPillar1Title"
  | "landingPillar2Title"
  | "landingPillar3Title"
  | "landingPillar1Body"
  | "landingPillar2Body"
  | "landingPillar3Body";

export function TrustPillar({
  icon: Icon,
  titleKey,
  bodyKey,
  delay,
}: {
  icon: LucideIcon;
  titleKey: PillarKey;
  bodyKey: PillarKey;
  accent: string; // accepted for compat, ignored — we use semantic tokens now
  iconColor: string; // accepted for compat, ignored
  delay: number; // accepted for compat, ignored
}) {
  const { t } = useLanguage();
  return (
    <section className="border-t border-border pt-5">
      <div className="flex items-start gap-3">
        <span className="size-9 grid place-items-center rounded-md border border-border bg-surface text-primary shrink-0">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="text-base font-semibold text-ink leading-tight">
            {t(titleKey)}
          </h3>
          <p className="text-sm text-ink-muted leading-relaxed text-pretty">
            {t(bodyKey)}
          </p>
        </div>
      </div>
    </section>
  );
}
