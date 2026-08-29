"use client";
// UploadDropzone — file picker with drag-and-drop for verification docs.
// VER-01: worker uploads ID / skill cert. VER-04: employer uploads company doc.
// VER-06: the form never collects the ID number textually; we only ever
// take a file. The masked label ("ID Proof") is applied server-side.
import { useCallback, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

type DocType = "id" | "skill_cert" | "company";

export interface UploadedDoc {
  id: string;
  status: string;
}

export function UploadDropzone({
  docType,
  skillId,
  skillName,
  onUploaded,
  disabled,
}: {
  docType: DocType;
  skillId?: string;
  skillName?: string;
  onUploaded?: (doc: UploadedDoc) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.has(file.type)) return t("uploadBadType");
    if (file.size > MAX_BYTES) return t("uploadTooBig");
    if (file.size === 0) return t("uploadEmpty");
    return null;
  }, [t]);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setPickedFile(file);
    },
    [validate],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [disabled, onFile],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      // Reset input so same file can be picked again
      e.target.value = "";
    },
    [onFile],
  );

  const upload = useCallback(async () => {
    if (!pickedFile) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", pickedFile, pickedFile.name);
      fd.append("docType", docType);
      fd.append("fileName", pickedFile.name);
      fd.append("fileType", pickedFile.type);
      fd.append("fileSize", String(pickedFile.size));
      if (docType === "skill_cert" && skillId) {
        fd.append("skillId", skillId);
      }

      const res = await fetch("/api/verifications", { method: "POST", body: fd });
      if (!res.ok) {
        let msg = t("errGeneric");
        try {
          const j = await res.json();
          if (j?.error === "VALIDATION") msg = t("errValidation");
          else if (j?.error === "UNAUTHORIZED") msg = t("errUnauthorized");
          else if (j?.error === "FORBIDDEN") msg = t("errForbidden");
        } catch {}
        throw new Error(msg);
      }
      const data = (await res.json()) as UploadedDoc & { previewToken?: string };
      setPickedFile(null);
      toast.success(
        docType === "id" ? t("uploadDoneId") : docType === "company" ? t("uploadDoneCompany") : t("uploadDoneCert"),
      );
      onUploaded?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errGeneric"));
      toast.error(e instanceof Error ? e.message : t("errGeneric"));
    } finally {
      setUploading(false);
    }
  }, [pickedFile, docType, skillId, onUploaded, t]);

  // Hide the dropzone entirely when there's no session (AuthGate will redirect).
  if (!session) return null;

  const hint =
    docType === "id"
      ? t("verifyUploadId")
      : docType === "skill_cert"
        ? skillName
          ? `${t("verifyUploadCert")} — ${skillName}`
          : t("verifyUploadCert")
        : t("verifyUploadCompany");

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <p className="text-sm font-semibold flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          {hint}
        </p>
      </div>

      <div className="p-4">
        {!pickedFile && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !disabled) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t("verifyDropHere")}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors min-h-32 flex flex-col items-center justify-center gap-2",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-accent/40",
              disabled && "opacity-60 pointer-events-none",
            )}
          >
            <UploadCloud className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">{t("verifyDropHere")}</p>
            <p className="text-xs text-muted-foreground">PDF · JPG · PNG · ≤5MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={onInputChange}
              disabled={disabled}
            />
          </div>
        )}

        {pickedFile && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="size-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{pickedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(pickedFile.size / 1024).toFixed(1)} KB · {pickedFile.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickedFile(null)}
                  aria-label={t("removeFileAria")}
                >
                  <X className="size-4" />
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={upload}
                disabled={uploading}
                className="min-h-11"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
                {uploading ? t("loading") : t("submit")}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-rose-600 mt-3">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          {t("verifyPiiNote")}
        </p>
      </div>
    </div>
  );
}
