"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  Briefcase, MapPin, ArrowRight, Clock, CheckCircle2, XCircle, Loader2, RefreshCcw,
  Undo2, CornerUpLeft, Ban,
} from "lucide-react";
import { toast } from "sonner";
import type { Application } from "@/lib/schemas";
import { NotificationsBell } from "@/components/worker/NotificationsBell";

interface MyApplicationItem extends Application {
  job: {
    id: string;
    title: string;
    tradeId: string | null;
    trade?: { nameEn: string; nameHi: string; nameTe: string; category: string } | null;
    headcount: number;
    wageMin: number;
    wageMax: number;
    city: string;
    shift: "day" | "night" | "any";
    isUrgent: boolean;
    employer?: { id: string; companyName: string; city: string; isVerified: boolean };
  };
}

const STAGE_KEYS: Record<string, "trackerStageApplied" | "trackerStageShortlisted" | "trackerStageInterview" | "trackerStageOffer" | "trackerStageHired" | "trackerStageRejected" | "trackerStageWithdrawn"> = {
  applied: "trackerStageApplied",
  shortlisted: "trackerStageShortlisted",
  interview: "trackerStageInterview",
  offer: "trackerStageOffer",
  hired: "trackerStageHired",
  rejected: "trackerStageRejected",
  withdrawn: "trackerStageWithdrawn",
};

const STAGE_TONE: Record<string, string> = {
  applied: "bg-muted text-muted-foreground border-border",
  shortlisted: "bg-amber-100 text-amber-800 border-amber-300",
  interview: "bg-violet-100 text-violet-800 border-violet-300",
  offer: "bg-emerald-100 text-emerald-800 border-emerald-300",
  hired: "bg-emerald-200 text-emerald-900 border-emerald-400",
  rejected: "bg-rose-100 text-rose-800 border-rose-300",
  withdrawn: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700",
};

// Active stages a worker may withdraw from (round 12).
const WITHDRAWABLE = new Set(["applied", "shortlisted", "interview", "offer"]);

// Per-card action state for the inline two-step withdraw (arm → confirm).
function WithdrawButton({ appId, onDone }: { appId: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function fire(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      // Disarm if not confirmed within 4s.
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/applications/${appId}/withdraw`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(t("withdrawSuccess"));
      onDone();
    } catch {
      toast.error(t("withdrawFailed"));
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }

  return (
    <button
      type="button"
      onClick={fire}
      disabled={busy}
      title={armed ? t("withdrawConfirmHint") : t("withdrawAction")}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors min-h-8 disabled:opacity-60 ${
        armed
          ? "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Ban className="size-3" />}
      {armed ? t("withdrawConfirmHint") : t("withdrawAction")}
    </button>
  );
}

// Re-apply button shown on withdrawn cards (round 12).
function ReapplyButton({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  async function fire(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("reapplySuccess"));
      onDone();
    } catch {
      toast.error(t("applyFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={fire}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40 min-h-8"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <CornerUpLeft className="size-3" />}
      {t("reapplyAction")}
    </button>
  );
}

export default function WorkerApplicationsPage() {
  const { t, lang } = useLanguage();
  const [apps, setApps] = useState<MyApplicationItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/applications/mine", { cache: "no-store" });
      if (!res.ok) {
        setApps([]);
        return;
      }
      const data = (await res.json()) as { items: MyApplicationItem[] };
      setApps(data.items ?? []);
    } catch {
      setApps([]);
    }
  }, []);

  useEffect(() => {
    // Defer the initial load to avoid setState-in-effect anti-pattern.
    const id = setTimeout(load, 0);
    // Poll every 5s for live status updates (WRK-07: status reflects within 5s)
    const pollId = setInterval(load, 5000);
    return () => { clearTimeout(id); clearInterval(pollId); };
  }, [load]);

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("trackerTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("navApplications")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={load}
            aria-label={t("refreshApplicationsAria")}
            title={t("refresh")}
            className="size-9 min-h-9 min-w-9 active:animate-spin transition-transform"
          >
            <RefreshCcw className="size-4" />
          </Button>
          <NotificationsBell />
        </div>
      </header>

      {apps === null && <LoadingSkeleton count={3} />}

      {apps && apps.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title={t("trackerEmpty")}
          description={t("feedTitle")}
          action={<Button asChild><Link href="/home">{t("navHome")}</Link></Button>}
        />
      )}

      {apps && apps.length > 0 && (
        <ul className="grid gap-3">
          {apps.map(a => {
            const tradeName = a.job.trade
              ? (lang === "hi" ? a.job.trade.nameHi : lang === "te" ? a.job.trade.nameTe : a.job.trade.nameEn)
              : null;
            const stageKey = STAGE_KEYS[a.status] ?? "trackerStageApplied";
            const tone = STAGE_TONE[a.status] ?? STAGE_TONE.applied;
            const isTerminal = a.status === "hired" || a.status === "rejected" || a.status === "withdrawn";
            const accentBar =
              a.status === "hired" ? "bg-emerald-500" :
              a.status === "rejected" ? "bg-red-400" :
              a.status === "withdrawn" ? "bg-slate-400 dark:bg-slate-600" :
              a.status === "offer" ? "bg-accent" :
              a.status === "interview" ? "bg-primary" :
              a.status === "shortlisted" ? "bg-primary/70" :
              "bg-muted-foreground/40";
            return (
              <li key={a.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Link href={`/applications/${a.id}`} className="group block">
                  <Card className={`cursor-pointer transition-all group-hover:shadow-md group-hover:-translate-y-0.5 relative overflow-hidden ${
                    a.status === "withdrawn"
                      ? "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-950/20 group-hover:border-slate-400 dark:group-hover:border-slate-600"
                      : "group-hover:border-primary/40"
                  }`}>
                    <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1 ${a.status === "withdrawn" ? "bg-gradient-to-b from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-700" : accentBar}`} />
                    <CardContent className="p-4 pl-5 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-base line-clamp-1 ${a.status === "withdrawn" ? "text-muted-foreground" : ""}`}>{a.job.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {tradeName && <span>{tradeName}</span>}
                          {tradeName && <span aria-hidden>·</span>}
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />{a.job.city}
                          </span>
                          {a.job.employer && (
                            <span className="inline-flex items-center gap-1">
                              <span aria-hidden>·</span>
                              {a.job.employer.companyName}
                              {a.job.employer.isVerified && (
                                <VerificationBadge status="approved" label={t("feedVerifiedEmployer")} />
                              )}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <WageDisplay min={a.job.wageMin} max={a.job.wageMax} size="sm" />
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(a.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={`${tone} border font-semibold gap-1`}>
                          {a.status === "hired" ? <CheckCircle2 className="size-3" /> : a.status === "rejected" ? <XCircle className="size-3" /> : a.status === "withdrawn" ? <Undo2 className="size-3" /> : null}
                          {t(stageKey)}
                        </Badge>
                        {/* Round 12: worker-initiated actions — withdraw (active) / re-apply (withdrawn) */}
                        {WITHDRAWABLE.has(a.status) && (
                          <WithdrawButton appId={a.id} onDone={load} />
                        )}
                        {a.status === "withdrawn" && (
                          <ReapplyButton jobId={a.jobId} onDone={load} />
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                          {t("open")}
                          <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                        {!isTerminal && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> {t("liveLabel")}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
