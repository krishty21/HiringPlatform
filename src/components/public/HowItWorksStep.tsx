"use client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { LucideIcon } from "lucide-react";

export function HowItWorksStep({
  number,
  icon: Icon,
  titleKey,
  bodyKey,
  delay,
  isLast = false,
}: {
  number: number;
  icon: LucideIcon;
  titleKey: "landingStep1Title" | "landingStep2Title" | "landingStep3Title";
  bodyKey: "landingStep1Body" | "landingStep2Body" | "landingStep3Body";
  delay: number; // compat
  isLast?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <section
      className={`flex flex-col gap-3 pt-5 ${
        isLast ? "" : "border-b border-border pb-6"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-7 grid place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold"
        >
          {number}
        </span>
        <span className="size-8 grid place-items-center rounded-md border border-border bg-surface text-ink-muted">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="text-base font-semibold text-ink leading-tight">
          {t(titleKey)}
        </h3>
      </div>
      <p className="text-sm text-ink-muted leading-relaxed text-pretty pl-10">
        {t(bodyKey)}
      </p>
    </section>
  );
}
