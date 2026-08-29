"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, HardHat } from "lucide-react";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-10 pb-4 sm:pt-16 sm:pb-6 flex flex-col gap-5">
      {/* Eyebrow — single line, no chip-with-glow */}
      <p className="eyebrow text-ink-subtle">
        {t("landingHeroEyebrow")}
      </p>

      {/* Hero headline — the human problem as lede */}
      <h1 className="h-display">
        {t("landingHeroTitle")}
      </h1>

      <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl text-pretty">
        {t("landingHeroSubtitle")}
      </p>

      {/* Two CTAs — equal-weight cards with accent spine, no glow / no scale */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl w-full pt-2">
        <Link
          href="/login?demo=demo-worker"
          aria-label={t("landingCtaWorker")}
          className="accent-spine group relative flex flex-col gap-1.5 pl-5 p-4 sm:p-5 rounded-md border border-border bg-surface hover:border-accent/40 hover:bg-surface-sunken transition-colors"
        >
          <span className="flex items-center gap-2">
            <HardHat className="size-4 text-accent" aria-hidden />
            <span className="eyebrow text-ink-subtle">
              {t("landingCtaWorker")}
            </span>
          </span>
          <span className="text-base sm:text-lg font-medium text-ink-strong text-balance">
            {t("landingCtaWorkerSublabel")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-meta text-accent mt-1">
            {t("continue")}
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>

        <Link
          href="/login?demo=demo-employer"
          aria-label={t("landingCtaEmployer")}
          className="group relative flex flex-col gap-1.5 p-4 sm:p-5 rounded-md border border-border bg-surface hover:border-primary/40 hover:bg-surface-sunken transition-colors"
        >
          <span className="flex items-center gap-2">
            <Briefcase className="size-4 text-primary" aria-hidden />
            <span className="eyebrow text-ink-subtle">
              {t("landingCtaEmployer")}
            </span>
          </span>
          <span className="text-base sm:text-lg font-medium text-ink-strong text-balance">
            {t("landingCtaEmployerSublabel")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-meta text-primary mt-1">
            {t("continue")}
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
      </div>

      <p className="text-meta text-ink-subtle pt-1">
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-meta text-primary">
          <Link href="/login">{t("navLogin")}</Link>
        </Button>
      </p>
    </section>
  );
}
