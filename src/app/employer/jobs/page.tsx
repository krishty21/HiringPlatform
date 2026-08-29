"use client";
import { useEffect, useState } from "react";
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
import { Briefcase, Users, Plus, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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

export default function MyJobsPage() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<MyJob[] | null>(null);

  useEffect(() => {
    fetch("/api/employer/jobs")
      .then(r => r.json())
      .then((data: { items: MyJob[] }) => setJobs(data.items ?? []))
      .catch(() => setJobs([]));
  }, []);

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between">
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
          description="Post your first job to start receiving applications."
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
                <TableHead>Job</TableHead>
                <TableHead>{t("jobLocation")}</TableHead>
                <TableHead>{t("jobWage")}</TableHead>
                <TableHead className="text-center">{t("myJobsApplicants")}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j, idx) => (
                <TableRow key={j.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ animationDelay: `${idx * 40}ms` }}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-2">
                        {j.isUrgent && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-[10px]">
                            <Zap className="size-3" />{t("feedUrgent")}
                          </Badge>
                        )}
                        {j.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {j.tradeName ?? "—"} · {t("jobHeadcount")}: {j.headcount} · {j.shift} shift
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
                        {j.applicationsByStatus.hired} hired
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={j.status === "open" ? "default" : "secondary"}
                      className={j.status === "open" ? "bg-emerald-600" : ""}
                    >
                      {j.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="min-h-9"
                    >
                      <Link href={`/employer/pipeline?jobId=${j.id}`}>Pipeline →</Link>
                    </Button>
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
