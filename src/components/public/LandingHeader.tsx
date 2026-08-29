"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-primary group"
        aria-label={t("brand")}
      >
        <span className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center text-base shadow-sm ring-1 ring-primary/20 transition-transform group-hover:scale-105">
          श्र
        </span>
        <span className="text-xl tracking-tight">{t("brand")}</span>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageToggle compact />
        <Link href="/login">
          <Button variant="default" className="min-h-11 shadow-sm" aria-label={t("navLogin")}>
            {t("navLogin")}
          </Button>
        </Link>
      </div>
    </header>
  );
}
