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
  MoreVertical, ChevronRight, Loader2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import { EndorsementModal } from "./EndorsementModal";
import type { Skill } from "@/lib/schemas";

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

const STATUS_TONE: Record<Status, string> = {
  applied: "border-t-muted-foreground/40 bg-muted/30",
  shortlisted: "border-t-accent bg-accent/[0.06]",
  interview: "border-t-primary bg-primary/[0.05]",
  offer: "border-t-accent bg-accent/[0.10]",
  hired: "border-t-emerald-500 bg-emerald-50/60",
  rejected: "border-t-rose-400 bg-rose-50/60",
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
  // Avoids the setState-in-effect anti-pattern; updates are driven by user actions only.
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
      // Optimistic update via overrides map (no setState-in-effect issues)
      setOverrides(prev => ({ ...prev, [applicationId]: status }));
      toast.success(`${t(STATUS_KEYS[status])} ✓`);

      // EMP-07: hire → prompt endorsement
      if (status === "hired") {
        const a = items.find(x => x.id === applicationId);
        if (a) {
          setEndorsement({ workerId: a.workerId, workerName: a.worker.fullName });
        }
      }
    } catch {
      toast.error("Could not update stage. Try again.");
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
    // over.id may be a card id (drop onto card) or a column id (drop into empty column).
    // If over.id is a card, find its status; else if it's a column id (status name), use that.
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
    toast.success(`Shortlisted ${ok} candidate${ok === 1 ? "" : "s"} ✓`);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {t("pipelineDragHint")}
        </p>
        {bulkSelected.size > 0 && (
          <Button onClick={bulkShortlist} disabled={busy === "bulk"} className="gap-2 min-h-10">
            {busy === "bulk" && <Loader2 className="size-4 animate-spin" />}
            {t("pipelineBulkShortlist")} ({bulkSelected.size})
          </Button>
        )}
      </div>

      {/* Horizontal scroll on mobile; 6-column grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-4 shramsetu-scroll snap-x">
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
  const cardIds = useMemo(() => applications.map(a => a.id), [applications]);
  return (
    <div className="shrink-0 w-72 sm:w-80 snap-start">
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-xl border border-border border-t-4 ${STATUS_TONE[status]} p-3 min-h-48 shadow-sm transition-shadow`}
      >
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className={`size-1.5 rounded-full ${status === "hired" ? "bg-emerald-500" : status === "rejected" ? "bg-rose-400" : status === "offer" ? "bg-accent" : status === "interview" ? "bg-primary" : status === "shortlisted" ? "bg-accent/70" : "bg-muted-foreground/40"}`} aria-hidden />
            {title}
          </h3>
          <Badge variant="outline" className="text-xs tabular-nums">{applications.length}</Badge>
        </div>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {applications.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/60 rounded-lg">
              No candidates here.
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

  // Action set per status — accessibility + mobile-friendly (directive §13)
  const actions: { label: string; status: Status; tone: string }[] = [];
  if (application.status === "applied") {
    actions.push({ label: t("pipelineBulkShortlist").replace(" shortlist", ""), status: "shortlisted", tone: "bg-amber-100 text-amber-900 hover:bg-amber-200" });
  }
  if (application.status === "shortlisted") {
    actions.push({ label: "Interview", status: "interview", tone: "bg-sky-100 text-sky-900 hover:bg-sky-200" });
  }
  if (application.status === "interview") {
    actions.push({ label: t("trackerStageOffer"), status: "offer", tone: "bg-violet-100 text-violet-900 hover:bg-violet-200" });
  }
  if (application.status === "offer") {
    actions.push({ label: t("pipelineHire"), status: "hired", tone: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200" });
  }
  if (application.status !== "rejected" && application.status !== "hired") {
    actions.push({ label: t("trackerStageRejected"), status: "rejected", tone: "bg-rose-100 text-rose-900 hover:bg-rose-200" });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg bg-card border border-border shadow-sm p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing ${dragging || isDragging ? "opacity-50 ring-2 ring-primary/40" : ""}`}
      aria-roledescription="draggable application card"
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
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{w.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{w.tradeName ?? "—"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {actions.map(a => (
              <DropdownMenuItem
                key={a.status}
                onClick={() => onTransition(application.id, a.status)}
                disabled={busy}
              >
                {a.label}
                <ChevronRight className="size-3 ml-auto" />
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

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <Badge variant="outline" className="text-[10px]">{w.yearsExp} yrs</Badge>
        <Badge variant="outline" className="text-[10px]">₹{w.wageMin}–{w.wageMax}</Badge>
        {w.availableToday && (
          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
            {t("today")}
          </Badge>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border" onClick={(e) => e.stopPropagation()}>
          {actions.map(a => (
            <Button
              key={a.status}
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-[11px] ${a.tone}`}
              onClick={(e) => { e.stopPropagation(); onTransition(application.id, a.status); }}
              disabled={busy}
            >
              {busy ? <Loader2 className="size-3 animate-spin" /> : a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
