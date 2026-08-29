"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function PublicFooter() {
  const { t } = useLanguage();
  return (
    <footer className="relative border-t border-border bg-secondary/30 mt-auto">
      {/* Top gradient hairline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 flex flex-col gap-4 items-center text-center">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-primary group"
          aria-label={t("brand")}
        >
          <span className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm shadow-sm transition-transform group-hover:scale-105">
            श्र
          </span>
          <span className="text-base">{t("brand")}</span>
        </Link>
        <p className="text-sm font-medium text-foreground">
          {t("landingFooterTagline")}
        </p>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          {t("footerMission")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80 pt-1">
          <span>తెలుగు</span>
          <span aria-hidden>·</span>
          <span>हिंदी</span>
          <span aria-hidden>·</span>
          <span>English</span>
        </div>
      </div>
    </footer>
  );
}
