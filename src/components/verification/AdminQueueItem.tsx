"use client";
// AdminQueueItem — a Sheet (drawer) showing the admin's view of one pending doc.
// ADM-01: shows preview (PDF iframe / image), extracted_json (if any),
// approve/reject buttons + reviewer note textarea.
// On PATCH, calls /api/admin/verifications/:id which triggers recompute +
// pushNotification (VER-03 + VER-02).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, XCircle, AlertCircle } from "lucide-react";
import type { AdminVerificationItem } from "./types";

interface AdminQueueItemProps {
  item: AdminVerificationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActioned?: (id: string, status: "approved" | "rejected") => void;
}

function parseExtracted(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function AdminQueueItem({ item, open, onOpenChange, onActioned }: AdminQueueItemProps) {
  const { t } = useLanguage();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Reset note when item changes
  useEffect(() => {
    if (item) {
      setNote(item.reviewerNote ?? "");
      setToken(null);
      setTokenError(null);
    }
  }, [item?.id]);

  // Fetch a signed-URL token (admin preview path) for the current doc.
  // Deferred via setTimeout to satisfy the set-state-in-effect lint rule.
  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    const fetchToken = async () => {
      try {
        const res = await fetch("/api/storage/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ docId: item.id }),
        });
        if (!res.ok) throw new Error("sign failed");
        const data = (await res.json()) as { token: string };
        if (!cancelled) {
          setToken(data.token);
          setTokenError(null);
        }
      } catch {
        if (!cancelled) setTokenError(t("errGeneric"));
      }
    };
    setTimeout(fetchToken, 0);
    return () => { cancelled = true; };
  }, [item?.id, t]);

  const extracted = useMemo(() => (item ? parseExtracted(item.extractedJson) : null), [item]);

  const submit = useCallback(
    async (status: "approved" | "rejected") => {
      if (!item) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/admin/verifications/${encodeURIComponent(item.id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status, reviewerNote: note }),
        });
        if (!res.ok) {
          let msg = t("errGeneric");
          try {
            const j = await res.json();
            if (j?.error === "ALREADY_REVIEWED") msg = t("adminAlreadyReviewed");
            else if (j?.error === "UNAUTHORIZED") msg = t("errUnauthorized");
            else if (j?.error === "FORBIDDEN") msg = t("errForbidden");
          } catch {}
          throw new Error(msg);
        }
        toast.success(status === "approved" ? t("adminApprove") : t("adminReject"));
        onActioned?.(item.id, status);
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("errGeneric"));
      } finally {
        setBusy(false);
      }
    },
    [item, note, onActioned, onOpenChange, t],
  );

  if (!item) return null;

  // Localized role label (raw "worker"/"employer" never shown to admins)
  const roleLabel = item.owner.role === "employer"
    ? t("adminRoleEmployer")
    : item.owner.role === "worker"
      ? t("adminRoleWorker")
      : item.owner.role;

  const isPdf = item.fileType === "application/pdf";
  const isImage = item.fileType === "image/jpeg" || item.fileType === "image/png";
  const src = token ? `/api/storage/file?token=${encodeURIComponent(token)}` : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-4 p-4 sm:p-6 overflow-hidden">
        <SheetHeader>
          <SheetTitle>{item.maskedLabel}</SheetTitle>
          <SheetDescription>
            {item.owner.name} · {roleLabel}{item.owner.trade ? ` · ${item.owner.trade}` : ""}
            {" · "}{new Date(item.submittedAt).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        {/* Extracted fields (VER-05) */}
        <section className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t("adminExtract")}
          </p>
          {extracted ? (
            <dl className="text-sm space-y-1">
              {Object.entries(extracted).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="font-medium capitalize">{k}:</dt>
                  <dd className="text-muted-foreground">{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="size-4" />
              {t("adminManualReview")}
            </p>
          )}
        </section>

        {/* Doc preview */}
        <section className="flex-1 min-h-0 rounded-lg border border-border bg-muted/30 overflow-hidden">
          {tokenError ? (
            <div className="p-6 text-sm text-rose-600">{tokenError}</div>
          ) : !src ? (
            <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> {t("loading")}
            </div>
          ) : isPdf ? (
            <iframe src={src} title={item.maskedLabel} className="w-full h-[55vh] border-0" />
          ) : isImage ? (
            <img src={src} alt={item.maskedLabel} className="w-full h-[55vh] object-contain" />
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              {t("adminUnsupportedPreview")}{" "}
              <a href={src} className="text-primary underline" download>{t("adminDownload")}</a>
            </div>
          )}
        </section>

        {/* Reviewer note */}
        <section>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("adminReviewNote")}
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("adminNotePlaceholder")}
            rows={3}
            maxLength={500}
          />
        </section>

        <SheetFooter className="flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => submit("rejected")}
            disabled={busy}
            className="min-h-11 gap-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            {t("adminReject")}
          </Button>
          <Button
            type="button"
            onClick={() => submit("approved")}
            disabled={busy}
            className="min-h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {t("adminApprove")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
