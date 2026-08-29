"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PipelineKanban, type PipelineApplication } from "@/components/employer/PipelineKanban";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, KanbanSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Skill } from "@/lib/schemas";

interface JobOption { id: string; title: string; }

function PipelinePageBody() {
  const { t } = useLanguage();
  const search = useSearchParams();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(search.get("jobId") ?? "all");
  const [apps, setApps] = useState<PipelineApplication[] | null>(null);

  useEffect(() => {
    fetch("/api/skills").then(r => r.json()).then((d: { items: Skill[] }) => setSkills(d.items ?? []));
    fetch("/api/employer/jobs").then(r => r.json()).then((d: { items: JobOption[] }) => setJobs(d.items ?? []));
  }, []);

  useEffect(() => {
    const qs = selectedJobId !== "all" ? `?jobId=${selectedJobId}` : "";
    let cancelled = false;
    fetch(`/api/employer/applications${qs}`)
      .then(r => r.json())
      .then((d: { items: PipelineApplication[] }) => { if (!cancelled) setApps(d.items ?? []); })
      .catch(() => { if (!cancelled) setApps([]); });
    return () => { cancelled = true; };
  }, [selectedJobId]);

  return (
    <AppShell>
      <header className="mb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KanbanSquare className="size-6" />
            {t("pipelineTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("pipelineDragHint")}</p>
        </div>
        <div className="w-72">
          <Label htmlFor="jobFilter" className="text-xs text-muted-foreground">{t("filterByJob")}</Label>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger id="jobFilter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allJobsOption")}</SelectItem>
              {jobs.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {!apps && <LoadingSkeleton count={3} />}

      {apps && apps.length === 0 && (
        <EmptyState
          icon={Users}
          title={t("pipelineEmpty")}
          description={t("pipelineEmptyHint")}
        />
      )}

      {apps && apps.length > 0 && (
        <PipelineKanban applications={apps} skills={skills} />
      )}

      <Card className="mt-6 border-dashed bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Tip: Drag cards between columns or use the action buttons on each card.
          Bulk-select cards in the <span className="font-semibold">{t("trackerStageApplied")}</span> column to shortlist several at once.
          Hiring a worker opens an optional endorsement prompt — endorsements boost the worker's trust tier.
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={3} />}>
      <PipelinePageBody />
    </Suspense>
  );
}
