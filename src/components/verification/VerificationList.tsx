"use client";
// VerificationList — worker/employer's submitted docs (VER-02 status list).
// Each row shows: masked label, VerificationBadge, reviewer note, submitted date,
// preview link (Dialog with iframe for PDF / img for image).
// VER-06: no raw ID number is ever displayed; only masked labels.
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Clock, ShieldCheck } from "lucide-react";
import type { DocType, VerificationItem } from "./types";

interface VerificationListProps {
  /** Refresh trigger — increment to refetch. */
  refreshKey?: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function VerificationList({ refreshKey = 0 }: VerificationListProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<VerificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<VerificationItem | null>(null);

  // Map status → i18n label so the badge text is localized (verifyStatusPending etc.)
  const statusLabel = (status: "pending" | "approved" | "rejected") =>
    status === "pending" ? t("verifyStatusPending")
      : status === "approved" ? t("verifyStatusApproved")
        : t("verifyStatusRejected");

  // Load via setTimeout(load, 0) to satisfy the react-hooks/set-state-in-effect
  // lint rule (deferred initial fetch from effect).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/verifications", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { items: VerificationItem[] };
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t("errGeneric"));
      }
    };
    setTimeout(load, 0);
    return () => { cancelled = true; };
  }, [refreshKey, t]);

  if (error) {
    return (
      <EmptyState icon={FileText} title={t("errGeneric")} description={error} />
    );
  }
  if (!items) return <LoadingSkeleton count={3} />;

  if (items.length === 0) {
    return (
      <EmptyState icon={FileText} title={t("verifyNoDocs")} description={t("verifyPiiNote")} />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{item.maskedLabel}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.displayFileName}
                  </p>
                </div>
              </div>
              <VerificationBadge
                status={item.status as "pending" | "approved" | "rejected"}
                label={statusLabel(item.status as "pending" | "approved" | "rejected")}
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {formatDate(item.submittedAt)}
              </span>
              {item.reviewedAt && (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  {formatDate(item.reviewedAt)}
                </span>
              )}
            </div>

            {item.reviewerNote && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t("verifyReviewerNote")}
                </p>
                <p className="text-sm whitespace-pre-wrap">{item.reviewerNote}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-muted-foreground italic">{t("verifyMasked")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={() => setPreviewItem(item)}
              >
                <Eye className="size-4" />
                {t("verifyPreview")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <PreviewDialog item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}

function PreviewDialog({ item, onClose }: { item: VerificationItem | null; onClose: () => void }) {
  const { t } = useLanguage();
  const open = !!item;
  if (!item) return null;

  // Build the signed-URL endpoint that streams the file via token
  const src = `/api/storage/file?token=${encodeURIComponent(item.previewToken)}`;
  const isPdf = item.fileType === "application/pdf";
  const isImage = item.fileType === "image/jpeg" || item.fileType === "image/png";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{item.maskedLabel}</DialogTitle>
          <DialogDescription>
            {item.displayFileName} · {formatDate(item.submittedAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-muted/30">
          {isPdf && (
            <iframe
              src={src}
              title={item.maskedLabel}
              className="w-full h-[70vh] border-0"
            />
          )}
          {isImage && (
            <img
              src={src}
              alt={item.maskedLabel}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
          {!isPdf && !isImage && (
            <div className="p-6 text-sm text-muted-foreground">
              {t("adminUnsupportedPreview")}{" "}
              <a href={src} className="text-primary underline" download>
                {t("adminDownload")}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { DocType };
