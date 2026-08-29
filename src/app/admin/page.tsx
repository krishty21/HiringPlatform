"use client";
// /admin — Master Prompt §33: admin verification queue looks like credential
// infrastructure, NOT gaming/badge system. Pending Verification list with clean dl
// layout: Ravi Kumar, Electrician certificate, Uploaded PDF, Status Pending review,
// [Approve] [Reject] buttons.
//
// Removed: hover:scale-[1.02] decorative transform, bg-accent/40 hover tint,
// primary/10 amber corner-chip icon backgrounds.
// Added: border-b sectioned header, surface-raised stat cards (via shared StatCard),
// surface-inset quick-action panel, link from pending-docs StatCard with focus ring.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppShell } from "@/components/shared/AppShell";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { Users, Briefcase, Handshake, FileCheck, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stats {
  users: number;
  jobs: number;
  hires: number;
  pendingDocs: number;
}

export default function AdminHomePage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as Stats;
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t("errGeneric"));
      }
    };
    setTimeout(load, 0);
    return () => { cancelled = true; };
  }, [t]);

  return (
    <AppShell>
      <main className="flex flex-col gap-6 max-w-6xl mx-auto">
        {/* Header — border-b sectioned */}
        <header className="border-b border-border pb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center border border-border" aria-hidden>
              <FileCheck className="size-5" />
            </span>
            <div>
              <p className="text-meta uppercase tracking-wide text-ink-subtle">
                {t("adminEyebrow")}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {t("adminTitle")}
              </h1>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-11 gap-2">
            <Link href="/admin/verifications">
              <FileCheck className="size-4" aria-hidden />
              {t("adminQueue")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </header>

        {/* Stats strip (ADM-02) — dl/dt/dd grid via StatCard */}
        <section aria-label={t("adminStatsAria")}>
          <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-3">
            {t("adminStatsHeading")}
          </h2>
          {error ? (
            <LoadingSkeleton count={1} />
          ) : !stats ? (
            <LoadingSkeleton count={1} />
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label={t("adminStatsUsers")}
                value={stats.users}
                icon={Users}
                tone="default"
              />
              <StatCard
                label={t("adminStatsJobs")}
                value={stats.jobs}
                icon={Briefcase}
                tone="default"
              />
              <StatCard
                label={t("adminStatsHires")}
                value={stats.hires}
                icon={Handshake}
                tone="success"
              />
              {/* Pending Docs — clickable card linking to /admin/verifications */}
              <Link
                href="/admin/verifications"
                className="block rounded-md transition-colors hover:border-ink/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${t("adminStatsPending")}: ${stats.pendingDocs}`}
              >
                <StatCard
                  label={t("adminStatsPending")}
                  value={stats.pendingDocs}
                  hint={stats.pendingDocs > 0 ? t("openQueue") : t("allClear")}
                  icon={FileCheck}
                  tone={stats.pendingDocs > 0 ? "accent" : "default"}
                  className="cursor-pointer h-full"
                />
              </Link>
            </dl>
          )}
        </section>

        {/* Quick actions — surface-inset panel */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label={t("adminQuickActionsAria")}>
          <Link
            href="/admin/verifications"
            className="surface-raised shadow-raise rounded-md p-5 hover:border-ink/30 transition-colors min-h-11 block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center border border-border" aria-hidden>
                <FileCheck className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">{t("adminQueue")}</p>
                <p className="text-meta text-ink-subtle">
                  {t("adminQuickActionVerifyDesc")}
                </p>
              </div>
              <ChevronRight className="size-4 text-ink-subtle shrink-0" aria-hidden />
            </div>
          </Link>
        </section>

        {/* Platform analytics — visual charts from live aggregates */}
        <AnalyticsCharts />
      </main>
    </AppShell>
  );
}
