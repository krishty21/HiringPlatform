"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    // Log to the console for dev visibility (production would ship to Sentry).
    console.error("[ShramSetu] route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-destructive/5 via-background to-background overflow-x-clip">
      <header className="px-4 sm:px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-primary" aria-label={t("brand")}>
          <span className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center text-base shadow-sm">
            श्र
          </span>
          <span className="text-xl tracking-tight">{t("brand")}</span>
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="text-center max-w-md mx-auto flex flex-col items-center gap-6">
          <div className="relative">
            <span className="absolute inset-0 -z-10 blur-2xl bg-destructive/20 rounded-full" aria-hidden />
            <div className="size-16 rounded-full bg-destructive/10 text-destructive grid place-items-center">
              <AlertTriangle className="size-8" aria-hidden />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("errTitle")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("errHint")}
            </p>
          </div>

          {error.digest && (
            <p className="text-[10px] text-muted-foreground/70 font-mono">
              error digest: {error.digest}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => reset()} className="gap-2 min-h-11">
              <RotateCcw className="size-4" />
              {t("errTryAgain")}
            </Button>
            <Button asChild variant="outline" className="gap-2 min-h-11">
              <Link href="/">
                <Home className="size-4" />
                {t("errBackHome")}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-secondary/30 mt-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">{t("footerMission")}</p>
        </div>
      </footer>
    </div>
  );
}
