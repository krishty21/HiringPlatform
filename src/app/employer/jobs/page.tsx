"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { WageDisplay } from "@/components/shared/WageDisplay";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, Plus, Zap, Loader2, Ban, RotateCcw, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";

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
        className="min-h-9 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
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
      className={`min-h-9 gap-1.5 ${armed ? "" : "text-muted-foreground hover:text-foreground"}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
      {armed ? t("myJobsCloseConfirm") : t("myJobsClose")}
    </Button>
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
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("myJobsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("myJobsSub")}</p>
        </div>
        <Button asChild className="gap-2 min-h-11">
          <Link href="/employer/post"><Plus className="size-4" />{t("navPostJob")}</Link>
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
              <Link href="/employer/post"><Plus className="size-4" />{t("navPostJob")}</Link>
            </Button>
          }
        />
      )}

      {jobs && jobs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto shramsetu-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("myJobsColJob")}</TableHead>
                <TableHead>{t("jobLocation")}</TableHead>
                <TableHead>{t("jobWage")}</TableHead>
                <TableHead className="text-center">{t("myJobsApplicants")}</TableHead>
                <TableHead>{t("myJobsColStatus")}</TableHead>
                <TableHead className="text-right">{t("myJobsColActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j, idx) => (
                <TableRow
                  key={j.id}
                  className={`animate-in fade-in slide-in-from-bottom-1 duration-300 ${j.status === "closed" ? "opacity-70" : ""}`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-2">
                        {j.isUrgent && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-[10px]">
                            <Zap className="size-3" />{t("feedUrgent")}
                          </Badge>
                        )}
                        <span className={j.status === "closed" ? "text-muted-foreground" : ""}>{j.title}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {j.tradeName ?? "—"} · {t("jobHeadcount")}: {j.headcount} · {t(j.shift === "day" ? "shiftDay" : j.shift === "night" ? "shiftNight" : "shiftAny")} {t("jobShift").toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{j.city}</TableCell>
                  <TableCell><WageDisplay min={j.wageMin} max={j.wageMax} size="sm" /></TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <Users className="size-4 text-muted-foreground" />
                      <span className="font-semibold tabular-nums">{j.applicantCount}</span>
                    </div>
                    {j.applicationsByStatus.hired > 0 && (
                      <span className="ml-1 text-[10px] text-emerald-700">
                        {t("myJobsHired", { count: j.applicationsByStatus.hired })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {j.status === "open" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">
                        <span aria-hidden className="size-1.5 rounded-full bg-emerald-200" />
                        {t("myJobsStatusOpen")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700">
                        <span aria-hidden className="size-1.5 rounded-full bg-slate-500" />
                        {t("myJobsStatusClosed")}
                      </Badge>
                    )}
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
                        <Link href={`/employer/pipeline?jobId=${j.id}`}>{t("myJobsPipeline")}<ChevronRight className="size-3.5" /></Link>
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
    </AppShell>
  );
}
