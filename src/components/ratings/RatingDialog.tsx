"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { RatingStars } from "./RatingStars";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { motion } from "framer-motion";

interface RatingDialogProps {
  applicationId: string;
  // Direction from the caller's POV: "worker→employer" or "employer→worker"
  direction: "worker_to_employer" | "employer_to_worker";
  // Display name of the ratee (e.g. "Priya Manufacturing" or "Ravi Kumar")
  rateeName: string;
  // Optional trigger button label override (defaults to t('ratingPromptCta'))
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "sm" | "md" | "lg";
  onSubmitted?: () => void;
  children?: React.ReactNode;
}

const PRESETS: { score: number; key: "ratingPreset5" | "ratingPreset4" | "ratingPreset3" | "ratingPreset2" | "ratingPreset1" }[] = [
  { score: 5, key: "ratingPreset5" },
  { score: 4, key: "ratingPreset4" },
  { score: 3, key: "ratingPreset3" },
  { score: 2, key: "ratingPreset2" },
  { score: 1, key: "ratingPreset1" },
];

export function RatingDialog({
  applicationId,
  direction,
  rateeName,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "md",
  onSubmitted,
  children,
}: RatingDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setScore(0);
      setComment("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (score < 1) {
      setError(t("ratingErrorNoScore"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, score, comment: comment || "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "COOLDOWN" && data?.hoursLeft) {
          toast.error(t("ratingCooldown", { hours: data.hoursLeft }));
        } else if (data?.error === "ALREADY_RATED") {
          toast.error(t("ratingAlreadyRated"));
        } else if (data?.error === "NOT_HIRED") {
          toast.error(t("ratingNotHired"));
        } else {
          toast.error(t("errGeneric"));
        }
        return;
      }
      toast.success(t("ratingSubmittedToast"));
      setOpen(false);
      onSubmitted?.();
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  const triggerText = triggerLabel ?? t("ratingPromptCta");
  const titleKey = direction === "worker_to_employer" ? "ratingWorkerTitle" : "ratingEmployerTitle";
  const descriptionKey = direction === "worker_to_employer" ? "ratingWorkerDescription" : "ratingEmployerDescription";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className="gap-2 min-h-11"
            aria-haspopup="dialog"
          >
            <Star className="size-4" aria-hidden />
            {triggerText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.span
              initial={{ rotate: -15, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="inline-flex"
            >
              <Star className="size-5 text-amber-500 fill-amber-400" />
            </motion.span>
            {t(titleKey as any, { name: rateeName })}
          </DialogTitle>
          <DialogDescription>
            {t(descriptionKey as any)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Star selector */}
          <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10 p-5">
            <RatingStars
              value={score}
              size="lg"
              onChange={setScore}
              label={t("ratingStarsAriaLabel")}
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {score > 0 ? `${score} / 5` : t("ratingSelectHint")}
            </p>
          </div>

          {/* Quick-pick presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.score}
                type="button"
                onClick={() => setScore(p.score)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  score === p.score
                    ? "border-amber-500 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-border bg-card hover:border-amber-500/40 hover:bg-amber-50/40"
                }`}
                aria-pressed={score === p.score}
              >
                {t(p.key)}
              </button>
            ))}
          </div>

          {/* Comment */}
          <div className="grid gap-2">
            <Label htmlFor="rating-comment" className="text-xs text-muted-foreground">
              {t("ratingCommentLabel")}
            </Label>
            <Textarea
              id="rating-comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("ratingCommentPlaceholder")}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right tabular-nums">
              {comment.length}/500
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting || score < 1} className="gap-2 min-h-11">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
            {submitting ? t("ratingSubmitting") : t("ratingSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
