"use client";
// /admin — admin home (ADM-02: platform stats strip + ADM-03: analytics charts).
// Renders 4 StatCards: Total Users, Total Jobs, Total Hires, Pending Docs
// (the latter links to /admin/verifications), plus the analytics section below
// (see src/components/admin/AnalyticsCharts.tsx).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppShell } from "@/components/shared/AppShell";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { Users, Briefcase, ShieldCheck, FileCheck, ArrowRight } from "lucide-react";
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
      <div className="flex flex-col gap-6 max-w-6xl mx-auto">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{t("adminTitle")}</h1>
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <Link href="/admin/verifications">
              <FileCheck className="size-4" />
              {t("adminQueue")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </header>

        {/* Stats strip (ADM-02) */}
        <section>
          {error ? (
            <LoadingSkeleton count={1} />
          ) : !stats ? (
            <LoadingSkeleton count={1} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                icon={ShieldCheck}
                tone="success"
              />
              {/* Pending Docs — clickable card linking to /admin/verifications */}
              <Link
                href="/admin/verifications"
                className="block rounded-xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${t("adminStatsPending")}: ${stats.pendingDocs}`}
              >
                <StatCard
                  label={t("adminStatsPending")}
                  value={stats.pendingDocs}
                  hint={stats.pendingDocs > 0 ? "Open queue →" : "All clear"}
                  icon={FileCheck}
                  tone={stats.pendingDocs > 0 ? "accent" : "default"}
                  className="cursor-pointer"
                />
              </Link>
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/verifications"
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-accent/40 transition-colors min-h-11"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <FileCheck className="size-5" />
              </div>
              <div>
                <p className="font-semibold">{t("adminQueue")}</p>
                <p className="text-sm text-muted-foreground">
                  Review pending worker ID, skill cert and employer company docs.
                </p>
              </div>
            </div>
          </Link>
        </section>

        {/* Platform analytics — visual charts from live aggregates */}
        <AnalyticsCharts />
      </div>
    </AppShell>
  );
}
