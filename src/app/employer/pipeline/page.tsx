"use client";
// /employer/pipeline — Master Prompt §30: pipeline is OPERATIONAL.
// Stages: Applied → Shortlisted → Interview → Offer → Hired → Rejected.
// Improve: clarity, density, drag/drop affordance, keyboard actions, card hierarchy,
// stage counts, filtering, bulk actions. NEVER rely only on drag-and-drop — always
// provide accessible actions (each card has a Select dropdown).
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PipelineKanban, type PipelineApplication } from "@/components/employer/PipelineKanban";
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
      <main className="flex flex-col gap-6">
        {/* Header — border-b sectioned */}
        <header className="border-b border-border pb-4 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("pipelineEyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-2">
              <KanbanSquare className="size-5 text-ink-subtle" aria-hidden />
              {t("pipelineTitle")}
            </h1>
            <p className="text-meta text-ink-subtle mt-1">{t("pipelineDragHint")}</p>
          </div>
          <div className="w-72">
            <Label htmlFor="jobFilter" className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("filterByJob")}
            </Label>
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

        {/* Operational tip card */}
        <section className="surface-inset rounded-md p-4">
          <p className="text-meta text-ink-subtle">
            {t("pipelineHintLine1")}
          </p>
          <p className="text-meta text-ink-subtle mt-1">
            {t("pipelineHintLine2")}
          </p>
        </section>
      </main>
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
