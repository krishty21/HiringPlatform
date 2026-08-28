"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function PublicFooter() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-secondary/30 mt-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 flex flex-col gap-3 items-center text-center">
        <div className="flex items-center gap-2 font-bold text-primary">
          <span className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm">
            श्र
          </span>
          <span className="text-base">{t("brand")}</span>
        </div>
        <p className="text-sm font-medium text-foreground">
          {t("landingFooterTagline")}
        </p>
        <p className="text-xs text-muted-foreground max-w-2xl">
          {t("footerMission")}
        </p>
      </div>
    </footer>
  );
}
