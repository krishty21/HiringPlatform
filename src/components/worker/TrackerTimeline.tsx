"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
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

  if (application.status === "rejected") {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-4 flex items-center gap-3">
          <XCircle className="size-6 text-destructive" />
          <div>
            <p className="font-semibold text-sm">{t("trackerStageRejected")}</p>
            {application.rejectedAt && (
              <p className="text-xs text-muted-foreground">{fmtDateTime(application.rejectedAt)}</p>
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
      <CardContent className="p-6">
        <div className="grid gap-2">
          <p className="font-semibold">{t("trackerTitle")}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {t("onboardStep")} 1 → 5 · {t("loading").replace("…", "")}
          </p>
        </div>
        <ol className="relative grid gap-6 pl-8">
          {/* vertical line */}
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
                  {reached ? <CheckCircle2 className="size-4" /> : <Circle className="size-3.5" />}
                </span>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${reached ? "" : "text-muted-foreground"}`}>
                    {t(stageLabel)}
                  </p>
                  {isCurrent && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-accent/40">
                      <Clock className="size-3" />
                      {t("today")}
                    </Badge>
                  )}
                </div>
                {ts ? (
                  <p className="text-xs text-muted-foreground">{fmtDateTime(ts)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/70">—</p>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
