"use client";
// /employer/jobs — clean table with close/reopen, status badges, applicant counts.
// Master Prompt §16/§28: avoid card-with-card-with-card; use semantic tables.
// Preserved: two-step arm→confirm UX for close (mirrors worker withdraw).
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { WageDisplay } from "@/components/shared/WageDisplay";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, Plus, Loader2, Ban, RotateCcw, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MyJob {
  id: string;
  title: string;
  tradeName: string | null;
  headcount: number;
  wageMin: number;
  wageMax: number;
  city: string;
  shift: string;
  isUrgent: boolean;
  status: string;
  createdAt: string;
  applicantCount: number;
  applicationsByStatus: Record<string, number>;
}

// Two-step close confirmation (mirrors the worker withdraw pattern):
// idle → armed (destructive tint, 4s auto-disarm) → confirmed PATCH.
function CloseReopenButton({ job, onDone }: { job: MyJob; onDone: (j: MyJob) => void }) {
  const { t } = useLanguage();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const isClosed = job.status === "closed";

  const act = async () => {
    // Two-step arm→confirm only when CLOSING (stops new applications — the
    // risky direction). Reopening is non-destructive: single click.
    if (!armed && !isClosed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: isClosed ? "open" : "closed" }),
      });
      if (!res.ok) throw new Error("failed");
      toast.success(isClosed ? t("myJobsReopenedToast") : t("myJobsClosedToast"));
      onDone({ ...job, status: isClosed ? "open" : "closed" });
    } catch {
      toast.error(t("myJobsCloseFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (isClosed) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={act}
        disabled={busy}
        className="min-h-9 gap-1.5"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RotateCcw className="size-3.5" aria-hidden />}
        {t("myJobsReopen")}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={armed ? "destructive" : "outline"}
      onClick={act}
      disabled={busy}
      title={t("myJobsCloseHint")}
      className={cn("min-h-9 gap-1.5", !armed && "text-ink-muted hover:text-ink")}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Ban className="size-3.5" aria-hidden />}
      {armed ? t("myJobsCloseConfirm") : t("myJobsClose")}
    </Button>
  );
}

// Inline status badge — neutral, with status-dot color+shape.
function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  const isOpen = status === "open";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium",
        isOpen ? "text-positive" : "text-ink-subtle",
      )}
    >
      <span className={cn("status-dot", isOpen ? "is-positive" : "is-neutral")} aria-hidden />
      {isOpen ? t("myJobsStatusOpen") : t("myJobsStatusClosed")}
    </span>
  );
}

export default function MyJobsPage() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<MyJob[] | null>(null);

  useEffect(() => {
    fetch("/api/employer/jobs")
      .then(r => r.json())
      .then((data: { items: MyJob[] }) => setJobs(data.items ?? []))
      .catch(() => setJobs([]));
  }, []);

  const onStatusChanged = useCallback((updated: MyJob) => {
    setJobs(prev => prev?.map(j => (j.id === updated.id ? updated : j)) ?? prev);
  }, []);

  return (
    <AppShell>
      <main className="flex flex-col gap-6">
        {/* Header — border-b sectioned */}
        <header className="border-b border-border pb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("myJobsEyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {t("myJobsTitle")}
            </h1>
            <p className="text-meta text-ink-subtle mt-1">{t("myJobsSub")}</p>
          </div>
          <Button asChild className="gap-2 min-h-11">
            <Link href="/employer/post"><Plus className="size-4" aria-hidden />{t("navPostJob")}</Link>
          </Button>
        </header>

        {!jobs && <LoadingSkeleton count={4} />}

        {jobs && jobs.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title={t("myJobsEmpty")}
            description={t("myJobsEmptyHint")}
            action={
              <Button asChild className="gap-2 min-h-11">
                <Link href="/employer/post"><Plus className="size-4" aria-hidden />{t("navPostJob")}</Link>
              </Button>
            }
          />
        )}

        {jobs && jobs.length > 0 && (
          <Card className="surface-raised shadow-raise overflow-hidden">
            <div className="overflow-x-auto Jobhunt-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-meta uppercase tracking-wide text-ink-subtle">{t("myJobsColJob")}</TableHead>
                    <TableHead className="text-meta uppercase tracking-wide text-ink-subtle">{t("jobLocation")}</TableHead>
                    <TableHead className="text-meta uppercase tracking-wide text-ink-subtle">{t("jobWage")}</TableHead>
                    <TableHead className="text-center text-meta uppercase tracking-wide text-ink-subtle">{t("myJobsApplicants")}</TableHead>
                    <TableHead className="text-meta uppercase tracking-wide text-ink-subtle">{t("myJobsColStatus")}</TableHead>
                    <TableHead className="text-right text-meta uppercase tracking-wide text-ink-subtle">{t("myJobsColActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow
                      key={j.id}
                      className={cn(j.status === "closed" && "opacity-70")}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-2 text-ink">
                            {j.isUrgent && (
                              <span className="inline-flex items-center gap-1 text-warning-foreground text-[10px] font-semibold">
                                <span className="status-dot is-warning" aria-hidden />
                                {t("feedUrgent")}
                              </span>
                            )}
                            <span className={j.status === "closed" ? "text-ink-subtle" : ""}>{j.title}</span>
                          </span>
                          <span className="text-meta text-ink-subtle">
                            {j.tradeName ?? "—"} · {t("jobHeadcount")}: {j.headcount} · {t(j.shift === "day" ? "shiftDay" : j.shift === "night" ? "shiftNight" : "shiftAny")} {t("jobShift").toLowerCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-ink-muted">{j.city}</TableCell>
                      <TableCell><WageDisplay min={j.wageMin} max={j.wageMax} size="sm" /></TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <Users className="size-4 text-ink-subtle" aria-hidden />
                          <span className="font-semibold tabular-nums text-ink">{j.applicantCount}</span>
                        </div>
                        {j.applicationsByStatus.hired > 0 && (
                          <span className="ml-1 text-[10px] text-positive inline-flex items-center gap-1">
                            <span className="status-dot is-positive" aria-hidden />
                            {t("myJobsHired", { count: j.applicationsByStatus.hired })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={j.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <CloseReopenButton job={j} onDone={onStatusChanged} />
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="min-h-9 gap-1"
                          >
                            <Link href={`/employer/pipeline?jobId=${j.id}`}>{t("myJobsPipeline")}<ChevronRight className="size-3.5" aria-hidden /></Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>
    </AppShell>
  );
}
