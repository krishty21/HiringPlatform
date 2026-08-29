"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function PublicFooter() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-surface-sunken mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-6 items-start sm:items-center sm:text-center">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-primary"
          aria-label={t("brand")}
        >
          <span
            aria-hidden
            className="size-7 grid place-items-center rounded-md bg-primary text-primary-foreground text-sm"
          >
            JH
          </span>
          <span className="text-base">{t("brand")}</span>
        </Link>
        <p className="text-sm font-medium text-foreground max-w-xl text-balance">
          {t("landingFooterTagline")}
        </p>
        <p className="text-meta max-w-2xl text-pretty leading-relaxed">
          {t("footerMission")}
        </p>
        <div className="flex flex-col gap-1 sm:items-center w-full sm:w-auto">
          <span className="text-meta uppercase tracking-wide">
            {t("footerLangLabel")}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
            <span>తెలుగు</span>
            <span aria-hidden>·</span>
            <span>हिंदी</span>
            <span aria-hidden>·</span>
            <span>English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
