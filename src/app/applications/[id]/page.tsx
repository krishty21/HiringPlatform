"use client";
import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { TrackerTimeline } from "@/components/worker/TrackerTimeline";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  ArrowLeft, MapPin, Briefcase, Users, Clock, Share2, Building2, RefreshCcw,
} from "lucide-react";
import type { Application } from "@/lib/schemas";

interface ApplicationDetail extends Application {
  job: {
    id: string;
    title: string;
    tradeId: string | null;
    trade?: { id: string; nameEn: string; nameHi: string; nameTe: string; category: string } | null;
    headcount: number;
    wageMin: number;
    wageMax: number;
    city: string;
    lat: number;
    lng: number;
    shift: "day" | "night" | "any";
    isUrgent: boolean;
    description: string;
    employer?: { id: string; companyName: string; city: string; isVerified: boolean; industry: string };
  };
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLanguage();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${id}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as ApplicationDetail;
      setApp(data);
    } catch {}
  }, [id]);

  useEffect(() => {
    // Defer the initial load to avoid setState-in-effect anti-pattern.
    const id = setTimeout(load, 0);
    // WRK-07: status reflects within 5s — poll the application endpoint every 5s.
    const pollId = setInterval(load, 5000);
    return () => { clearTimeout(id); clearInterval(pollId); };
  }, [load]);

  function shareWhatsApp() {
    if (!app) return;
    const text = `📋 ${t("trackerTitle")} — ${app.job.title}\n${t("jobPostedBy")}: ${app.job.employer?.companyName ?? ""}\n${t("trackerStageApplied")}: ${new Date(app.appliedAt).toLocaleDateString()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (notFound) {
    return (
      <AppShell>
        <EmptyState
          icon={Briefcase}
          title={t("errNotFound")}
          description={t("trackerEmpty")}
          action={<Button asChild><Link href="/applications">{t("navApplications")}</Link></Button>}
        />
      </AppShell>
    );
  }

  if (!app) {
    return (
      <AppShell>
        <LoadingSkeleton count={3} />
      </AppShell>
    );
  }

  const tradeName = app.job.trade
    ? (lang === "hi" ? app.job.trade.nameHi : lang === "te" ? app.job.trade.nameTe : app.job.trade.nameEn)
    : null;

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <Link href="/applications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Job summary */}
          <Card>
            <CardContent className="p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("navApplications")}</p>
                <h1 className="text-2xl font-bold tracking-tight mt-1">{app.job.title}</h1>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5 flex-wrap">
                  {tradeName && <span>{tradeName}</span>}
                  {tradeName && <span aria-hidden>·</span>}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {app.job.city}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </span>
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("jobWage")}</p>
                  <WageDisplay min={app.job.wageMin} max={app.job.wageMax} size="md" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" />{t("jobHeadcount")}
                  </p>
                  <p className="text-lg font-bold tabular-nums mt-1">{app.job.headcount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("jobShift")}</p>
                  <Badge variant="outline" className="mt-1 uppercase">{app.job.shift}</Badge>
                </div>
              </div>

              <Separator />

              {/* Employer */}
              {app.job.employer && (
                <div>
                  <h2 className="font-semibold text-sm mb-1">{t("jobPostedBy")}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">{app.job.employer.companyName}</p>
                    {app.job.employer.isVerified && (
                      <VerificationBadge status="approved" label={t("feedVerifiedEmployer")} />
                    )}
                    <Badge variant="outline" className="text-xs gap-1">
                      <MapPin className="size-3" />
                      {app.job.employer.city}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{app.job.employer.industry}</Badge>
                  </div>
                </div>
              )}

              {app.job.description && (
                <>
                  <Separator />
                  <div>
                    <h2 className="font-semibold text-sm mb-1">{t("jobDescription")}</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{app.job.description}</p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Button asChild variant="outline" className="gap-2 min-h-11">
                  <Link href={`/jobs/${app.job.id}`}>
                    <Briefcase className="size-4" />
                    {t("navHome")}
                  </Link>
                </Button>
                <Button type="button" variant="ghost" onClick={shareWhatsApp} className="gap-2 min-h-11">
                  <Share2 className="size-4" />
                  {t("feedShare")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tracker timeline (WRK-07) */}
          <aside className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCcw className="size-3" />
                Live · 5s poll
              </p>
            </div>
            <TrackerTimeline application={app} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
