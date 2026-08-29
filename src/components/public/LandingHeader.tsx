"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-[6px] supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-primary"
          aria-label={t("brand")}
        >
          <span
            aria-hidden
            className="size-7 grid place-items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold"
          >
            श्र
          </span>
          <span className="text-base tracking-tight">{t("brand")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle compact />
          <Button asChild variant="default" size="sm" aria-label={t("navLogin")}>
            <Link href="/login">{t("navLogin")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
