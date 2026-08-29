"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, LogIn, Compass } from "lucide-react";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-secondary/40 via-background to-background overflow-x-clip">
      <header className="px-4 sm:px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-primary" aria-label={t("brand")}>
          <span className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center text-base shadow-sm">
            JH
          </span>
          <span className="text-xl tracking-tight">{t("brand")}</span>
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="text-center max-w-md mx-auto flex flex-col items-center gap-6">
          {/* Decorative 404 with bridge-arc motif */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            <p className="text-7xl sm:text-8xl font-black tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              404
            </p>
            <svg
              aria-hidden
              viewBox="0 0 220 12"
              className="mx-auto mt-1 h-2.5 w-44 text-accent"
              preserveAspectRatio="none"
            >
              <path d="M3 9 C 60 2, 160 2, 217 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("nfTitle")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("nfHint")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild className="gap-2 min-h-11">
              <Link href="/home">
                <Home className="size-4" />
                {t("nfCta")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 min-h-11">
              <Link href="/login">
                <LogIn className="size-4" />
                {t("navLogin")}
              </Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-2"
          >
            <Compass className="size-3.5" aria-hidden />
            Jobhunt · {t("tagline")}
          </motion.p>
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
