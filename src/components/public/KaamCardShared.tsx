"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { ShieldOff, ArrowLeft } from "lucide-react";

export function KaamCardDisabled() {
  const { t } = useLanguage();
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-11"
      >
        <ArrowLeft className="size-4" aria-hidden />
        <span>{t("kaamCardBackToHome")}</span>
      </Link>

      <article className="passport-card rounded-md p-8 flex flex-col items-center gap-4 text-center">
        <div className="size-16 rounded-md border border-border bg-surface-sunken text-ink-muted grid place-items-center">
          <ShieldOff className="size-8" aria-hidden />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-ink">
          {t("kaamCardTitle")}
        </h1>
        <p className="text-sm text-ink-muted max-w-md text-pretty">
          {t("kaamCardDisabled")}
        </p>
        <Button asChild variant="outline" className="min-h-12 mt-2">
          <Link href="/">{t("kaamCardBackToHome")}</Link>
        </Button>
      </article>
    </div>
  );
}

export function KaamCardNotFound() {
  const { t } = useLanguage();
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      <article className="passport-card rounded-md p-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold text-ink">
          {t("kaamCardNotFound")}
        </h1>
        <Button asChild variant="outline" className="min-h-12 mt-2">
          <Link href="/">{t("kaamCardBackToHome")}</Link>
        </Button>
      </article>
    </div>
  );
}

export function KaamCardHeader() {
  const { t } = useLanguage();
  return (
    <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-primary"
        aria-label={t("brand")}
      >
        <span className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center text-base">
          श्र
        </span>
        <span className="text-xl">{t("brand")}</span>
      </Link>
      <LanguageToggle compact />
    </header>
  );
}
