"use client";
import { useState, useMemo } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MoreHorizontal, ChevronRight, Loader2,
} from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import { EndorsementModal } from "./EndorsementModal";
import type { Skill } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STATUSES = ["applied", "shortlisted", "interview", "offer", "hired", "rejected"] as const;
type Status = typeof STATUSES[number];

const STATUS_KEYS: Record<Status, "trackerStageApplied" | "trackerStageShortlisted" | "trackerStageInterview" | "trackerStageOffer" | "trackerStageHired" | "trackerStageRejected"> = {
  applied: "trackerStageApplied",
  shortlisted: "trackerStageShortlisted",
  interview: "trackerStageInterview",
  offer: "trackerStageOffer",
  hired: "trackerStageHired",
  rejected: "trackerStageRejected",
};

// Status → status-dot class (color + shape, never color alone).
const STATUS_DOT: Record<Status, string> = {
  applied: "is-info",
  shortlisted: "is-warning",
  interview: "is-info",
  offer: "is-warning",
  hired: "is-positive",
  rejected: "is-error",
};

export interface PipelineApplication {
  id: string;
  jobId: string;
  workerId: string;
  status: Status;
  worker: {
    id: string;
    fullName: string;
    yearsExp: number;
    city: string;
    wageMin: number;
    wageMax: number;
    trustTier: "new" | "id_verified" | "skill_verified" | "top_pro";
    trustScore: number;
    availableToday: boolean;
    tradeName: string | null;
    skills: { skillId: string; proficiency: number; nameEn: string }[];
  };
  job: {
    id: string;
    title: string;
    tradeName: string | null;
  };
}

/**
 * PipelineKanban — operational hiring board.
 * Master Prompt §30: clarity, density, drag/drop affordance, keyboard actions,
 * card hierarchy, stage counts, filtering, bulk actions. NEVER rely only on drag-and-drop —
 * each card has an accessible Select dropdown for stage transitions.
 *
 * Removed: rose/amber/sky/violet color-only buttons, emerald available-today Badge,
 *   decorative top-gradient column tones (border-t-emerald-500/rose-400/...).
 * Added: status-dot on column header + per-card "Stage" Select dropdown (accessible
 *   alternative), surface-raised cards, neutral button tones with status-dot,
 *   bulk-shortlist button with explicit count badge.
 */
export function PipelineKanban({
  applications,
  skills,
}: {
  applications: PipelineApplication[];
  skills: Skill[];
}) {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [endorsement, setEndorsement] = useState<{ workerId: string; workerName: string } | null>(null);

  // Apply local "optimistic" status overrides on top of incoming applications.
  const items = useMemo(
    () => applications.map(a => overrides[a.id] ? { ...a, status: overrides[a.id]! } : a),
    [applications, overrides],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // Group items by status
  const grouped = useMemo(() => {
    const map: Record<Status, PipelineApplication[]> = {
      applied: [], shortlisted: [], interview: [], offer: [], hired: [], rejected: [],
    };
    for (const a of items) map[a.status].push(a);
    return map;
  }, [items]);

  const activeApp = activeId ? items.find(a => a.id === activeId) : null;

  async function transition(applicationId: string, status: Status) {
    setBusy(applicationId);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("FAILED");
      setOverrides(prev => ({ ...prev, [applicationId]: status }));
      toast.success(`${t(STATUS_KEYS[status])}`);

      // EMP-07: hire → prompt endorsement
      if (status === "hired") {
        const a = items.find(x => x.id === applicationId);
        if (a) {
          setEndorsement({ workerId: a.workerId, workerName: a.worker.fullName });
        }
      }
    } catch {
      toast.error(t("pipelineStageFailed"));
    } finally {
      setBusy(null);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const activeIdStr = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const overCard = items.find(a => a.id === overId);
    const newStatus = (STATUSES as readonly string[]).includes(String(overId))
      ? (String(overId) as Status)
      : overCard?.status;
    if (!newStatus) return;
    const active = items.find(a => a.id === activeIdStr);
    if (!active || active.status === newStatus) return;
    await transition(activeIdStr, newStatus);
  }

  function toggleBulk(id: string) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkShortlist() {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    setBusy("bulk");
    let ok = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "shortlisted" }),
        });
        if (res.ok) ok++;
      } catch {}
    }
    setOverrides(prev => {
      const next: Record<string, Status> = { ...prev };
      for (const id of bulkSelected) next[id] = "shortlisted";
      return next;
    });
    setBulkSelected(new Set());
    setBusy(null);
    toast.success(ok === 1 ? t("pipelineBulkDoneOne") : t("pipelineBulkDoneMany", { count: ok }));
  }

  // Total counts for the bulk action summary
  const totalApps = items.length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-meta text-ink-subtle flex items-center gap-2">
          <span className="status-dot is-info" aria-hidden />
          {t("pipelineDragHint")}
          <span className="tabular-nums">{totalApps}</span>
        </p>
        {bulkSelected.size > 0 && (
          <Button onClick={bulkShortlist} disabled={busy === "bulk"} className="gap-2 min-h-9">
            {busy === "bulk" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("pipelineBulkShortlist")} ({bulkSelected.size})
          </Button>
        )}
      </div>

      {/* Horizontal scroll on mobile; 6-column grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-4 Jobhunt-scroll snap-x">
        {STATUSES.map(status => (
          <PipelineColumn
            key={status}
            status={status}
            title={t(STATUS_KEYS[status])}
            applications={grouped[status]}
            bulkSelected={bulkSelected}
            onToggleBulk={toggleBulk}
            onTransition={transition}
            busyId={busy}
          />
        ))}
      </div>

      <DragOverlay>
        {activeApp ? <PipelineCard application={activeApp} dragging /> : null}
      </DragOverlay>

      {endorsement && (
        <EndorsementModal
          open={!!endorsement}
          onClose={() => setEndorsement(null)}
          workerId={endorsement.workerId}
          workerName={endorsement.workerName}
          skills={skills}
        />
      )}
    </DndContext>
  );
}

function PipelineColumn({
  status, title, applications, bulkSelected, onToggleBulk, onTransition, busyId,
}: {
  status: Status;
  title: string;
  applications: PipelineApplication[];
  bulkSelected: Set<string>;
  onToggleBulk: (id: string) => void;
  onTransition: (id: string, s: Status) => void;
  busyId: string | null;
}) {
  const { setNodeRef } = useDroppable({ id: status });
  const { t } = useLanguage();
  const cardIds = useMemo(() => applications.map(a => a.id), [applications]);
  return (
    <div className="shrink-0 w-72 sm:w-80 snap-start">
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 surface-raised shadow-raise rounded-md p-3 min-h-48"
      >
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-ink">
            <span className={cn("status-dot", STATUS_DOT[status])} aria-hidden />
            {title}
          </h3>
          <Badge variant="outline" className="text-xs tabular-nums">{applications.length}</Badge>
        </div>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {applications.length === 0 ? (
            <p className="text-meta text-ink-subtle py-6 text-center border border-dashed border-border rounded-md">
              {t("pipelineEmpty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {applications.map(a => (
                <PipelineCard
                  key={a.id}
                  application={a}
                  bulkSelectable={status === "applied"}
                  bulkChecked={bulkSelected.has(a.id)}
                  onBulkToggle={() => onToggleBulk(a.id)}
                  onTransition={onTransition}
                  busy={busyId === a.id}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function PipelineCard({
  application,
  bulkSelectable,
  bulkChecked,
  onBulkToggle,
  onTransition,
  dragging,
  busy,
}: {
  application: PipelineApplication;
  bulkSelectable?: boolean;
  bulkChecked?: boolean;
  onBulkToggle?: () => void;
  onTransition: (id: string, s: Status) => void;
  dragging?: boolean;
  busy?: boolean;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: application.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const w = application.worker;
  const initials = w.fullName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  // Accessible stage-transition Select — Master Prompt §30: "Do NOT rely only on drag-and-drop."
  const stageOptions: { value: Status; label: string }[] = [
    { value: "shortlisted", label: t("trackerStageShortlisted") },
    { value: "interview", label: t("trackerStageInterview") },
    { value: "offer", label: t("trackerStageOffer") },
    { value: "hired", label: t("trackerStageHired") },
    { value: "rejected", label: t("trackerStageRejected") },
  ].filter(o => o.value !== application.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "surface-raised shadow-raise rounded-md border border-border p-3 flex flex-col gap-2",
        "cursor-grab active:cursor-grabbing transition-colors hover:border-ink/30",
        (dragging || isDragging) && "opacity-50 ring-2 ring-primary/40",
      )}
      aria-roledescription={t("pipelineCardAriaRole")}
    >
      <div className="flex items-start gap-2">
        {bulkSelectable && (
          <Checkbox
            checked={bulkChecked}
            onCheckedChange={() => onBulkToggle?.()}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("bulkSelectAria")}
            className="mt-0.5"
          />
        )}
        <Avatar className="size-8 shrink-0 border border-border">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate text-ink">{w.fullName}</p>
          <p className="text-meta text-ink-subtle truncate">{w.tradeName ?? "—"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={(e) => e.stopPropagation()}
              aria-label={t("pipelineCardActions")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {stageOptions.map(a => (
              <DropdownMenuItem
                key={a.value}
                onClick={() => onTransition(application.id, a.value)}
                disabled={busy}
              >
                {a.label}
                <ChevronRight className="size-3 ml-auto" aria-hidden />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`/employer/candidates/${application.workerId}`} target="_blank" rel="noreferrer">
                {t("candidatesViewProfile")}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Meta row — neutral border-bottom chipless dl */}
      <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-subtle">
        <div className="flex items-center gap-1">
          <dt className="sr-only">{t("passportExperience")}</dt>
          <dd className="tabular-nums">{w.yearsExp} {t("unitYears")}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="sr-only">{t("passportWage")}</dt>
          <dd className="tabular-nums">₹{w.wageMin}–{w.wageMax}</dd>
        </div>
        {w.availableToday && (
          <div className="flex items-center gap-1">
            <dt className="sr-only">{t("today")}</dt>
            <dd className="flex items-center gap-1 text-positive">
              <span className="status-dot is-positive" aria-hidden />
              {t("today")}
            </dd>
          </div>
        )}
      </dl>

      {/* Accessible stage-transition Select + drag handle */}
      <div
        className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value=""
          onValueChange={(v) => onTransition(application.id, v as Status)}
          disabled={busy}
        >
          <SelectTrigger className="h-7 min-w-[120px] gap-1 text-xs px-2" aria-label={t("pipelineCardMoveTo")}>
            <SelectValue placeholder={t("pipelineCardMoveTo")} />
          </SelectTrigger>
          <SelectContent>
            {stageOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {busy && <Loader2 className="size-3.5 animate-spin text-ink-subtle" aria-hidden />}
      </div>
    </div>
  );
}
