"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const { t } = useLanguage();
  return (
    <header className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-primary"
        aria-label={t("brand")}
      >
        <span className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center text-base">
          श्र
        </span>
        <span className="text-xl">{t("brand")}</span>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageToggle compact />
        <Link href="/login">
          <Button variant="default" className="min-h-11" aria-label={t("navLogin")}>
            {t("navLogin")}
          </Button>
        </Link>
      </div>
    </header>
  );
}
