"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { CheckCircle2, Circle, Clock, XCircle, Undo2 } from "lucide-react";
import type { Application } from "@/lib/schemas";

type StageKey = "applied" | "shortlisted" | "interview" | "offer" | "hired" | "rejected";

const STAGE_KEYS: StageKey[] = ["applied", "shortlisted", "interview", "offer", "hired"];

const STAGE_LABEL: Record<StageKey, "trackerStageApplied" | "trackerStageShortlisted" | "trackerStageInterview" | "trackerStageOffer" | "trackerStageHired" | "trackerStageRejected"> = {
  applied: "trackerStageApplied",
  shortlisted: "trackerStageShortlisted",
  interview: "trackerStageInterview",
  offer: "trackerStageOffer",
  hired: "trackerStageHired",
  rejected: "trackerStageRejected",
};

function dateFor(app: Application, stage: StageKey): string | null {
  switch (stage) {
    case "applied": return app.appliedAt;
    case "shortlisted": return app.shortlistedAt;
    case "interview": return app.interviewAt;
    case "offer": return app.offerAt;
    case "hired": return app.hiredAt;
    case "rejected": return app.rejectedAt;
  }
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrackerTimeline({ application }: { application: Application }) {
  const { t } = useLanguage();

  if (application.status === "withdrawn") {
    // Round 12: worker withdrew — neutral dashed card with the "apply again" hint.
    return (
      <Card className="border-dashed border-border bg-surface-sunken">
        <CardContent className="p-4 flex items-start gap-3">
          <span className="size-9 grid place-items-center rounded-md border border-border bg-surface text-ink-muted shrink-0">
            <Undo2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-ink">{t("trackerStageWithdrawn")}</p>
            <p className="text-meta text-ink-muted mt-0.5">{t("withdrawBannerHint")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (application.status === "rejected") {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-4 flex items-start gap-3">
          <span className="size-9 grid place-items-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive shrink-0">
            <XCircle className="size-4" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-sm text-ink">{t("trackerStageRejected")}</p>
            {application.rejectedAt && (
              <p className="text-meta text-ink-muted mt-0.5 tabular-nums">{fmtDateTime(application.rejectedAt)}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compute the highest reached stage index for the linear timeline
  const currentIdx = STAGE_KEYS.indexOf(application.status as StageKey);

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-1 mb-3">
          <p className="font-semibold text-ink">{t("trackerTitle")}</p>
          <p className="text-meta text-ink-subtle">
            {t("onboardStep")} 1 → 5 · {t("loading").replace("…", "")}
          </p>
        </div>
        <ol className="relative grid gap-5 pl-8">
          {/* vertical rail */}
          <span className="tracker-line absolute left-[14px] top-2 bottom-2 w-0.5 rounded-full" aria-hidden />
          {STAGE_KEYS.map((stage, idx) => {
            const reached = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            const ts = dateFor(application, stage);
            const stageLabel = STAGE_LABEL[stage];

            const dotCls = isCurrent
              ? "tracker-step-current"
              : reached
                ? "tracker-step-done"
                : "tracker-step-todo";

            return (
              <li key={stage} className="relative flex flex-col gap-1">
                <span
                  className={`absolute -left-8 size-7 rounded-full grid place-items-center ${dotCls}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {reached ? <CheckCircle2 className="size-4" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${reached ? "text-ink" : "text-ink-subtle"}`}>
                    {t(stageLabel)}
                  </p>
                  {isCurrent && (
                    <span className="trust-pill is-pending">
                      <Clock className="size-3" aria-hidden />
                      {t("today")}
                    </span>
                  )}
                </div>
                {ts ? (
                  <p className="text-meta text-ink-muted tabular-nums">{fmtDateTime(ts)}</p>
                ) : (
                  <p className="text-meta text-ink-subtle">—</p>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
