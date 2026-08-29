"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  Briefcase, MapPin, Clock, Loader2, RefreshCcw,
  Ban, CornerUpLeft, ChevronRight,
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

// Status → status-dot color + state label (color + shape, never color alone).
const STAGE_DOT: Record<string, "is-neutral" | "is-info" | "is-warning" | "is-positive" | "is-error"> = {
  applied: "is-neutral",
  shortlisted: "is-info",
  interview: "is-info",
  offer: "is-warning",
  hired: "is-positive",
  rejected: "is-error",
  withdrawn: "is-neutral",
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-meta font-medium transition-colors min-h-9 disabled:opacity-60 ${
        armed
          ? "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "border-border bg-surface text-ink-muted hover:text-ink hover:border-ink/30"
      }`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Ban className="size-3.5" aria-hidden />}
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
      className="inline-flex items-center gap-1.5 rounded-md border border-positive/40 bg-positive/5 px-3 py-1.5 text-meta font-medium text-positive transition-colors hover:bg-positive/10 disabled:opacity-60 min-h-9"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CornerUpLeft className="size-3.5" aria-hidden />}
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
    const id = setTimeout(load, 0);
    const pollId = setInterval(load, 5000);
    return () => { clearTimeout(id); clearInterval(pollId); };
  }, [load]);

  return (
    <AppShell>
      <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-meta uppercase tracking-wider text-ink-subtle">
            {t("navApplications")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance">
            {t("trackerTitle")}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={load}
            aria-label={t("refreshApplicationsAria")}
            title={t("refresh")}
            className="size-9 min-h-9 min-w-9"
          >
            <RefreshCcw className="size-4" aria-hidden />
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
            const dotClass = STAGE_DOT[a.status] ?? "is-neutral";
            const isTerminal = a.status === "hired" || a.status === "rejected" || a.status === "withdrawn";
            const isWithdrawn = a.status === "withdrawn";
            return (
              <li key={a.id} className="animate-fade-in">
                <Link
                  href={`/applications/${a.id}`}
                  className="group block rounded-md border border-border bg-surface hover:bg-surface-sunken transition-colors"
                >
                  <article className="p-4 sm:p-5 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`status-dot ${dotClass}`}
                          aria-hidden
                        />
                        <span className="text-meta uppercase tracking-wider text-ink-subtle">
                          {t(stageKey)}
                        </span>
                        {isWithdrawn && (
                          <span className="text-meta text-ink-subtle">
                            · {t("withdrawBannerHint")}
                          </span>
                        )}
                      </div>
                      <h3 className={`text-base font-semibold leading-tight line-clamp-1 mt-1 ${
                        isWithdrawn ? "text-ink-muted" : "text-ink"
                      }`}>
                        {a.job.title}
                      </h3>
                      <p className="text-meta text-ink-muted mt-1 flex items-center gap-1.5 flex-wrap">
                        {tradeName && <span>{tradeName}</span>}
                        {tradeName && <span aria-hidden>·</span>}
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" aria-hidden />
                          {a.job.city}
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
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <WageDisplay min={a.job.wageMin} max={a.job.wageMax} size="sm" />
                        <span className="text-meta text-ink-muted inline-flex items-center gap-1 tabular-nums">
                          <Clock className="size-3" aria-hidden />
                          {new Date(a.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-meta font-medium text-ink-muted group-hover:text-ink transition-colors">
                        {t("open")}
                        <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                      </span>
                      {/* Worker-initiated actions — withdraw (active) / re-apply (withdrawn) */}
                      {WITHDRAWABLE.has(a.status) && (
                        <WithdrawButton appId={a.id} onDone={load} />
                      )}
                      {a.status === "withdrawn" && (
                        <ReapplyButton jobId={a.jobId} onDone={load} />
                      )}
                      {!isTerminal && (
                        <span className="text-meta text-ink-subtle inline-flex items-center gap-1 tabular-nums">
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                          {t("liveLabel")}
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
