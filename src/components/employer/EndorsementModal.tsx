"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Star } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import type { Skill } from "@/lib/schemas";

export function EndorsementModal({
  open,
  onClose,
  workerId,
  workerName,
  skills,
}: {
  open: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
  skills: Skill[];
}) {
  const { t } = useLanguage();
  const [skillId, setSkillId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!skillId) {
      toast.error(t("endorsementPickSkill"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/employer/endorsements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workerId, skillId, comment }),
      });
      if (!res.ok) throw new Error("FAILED");
      toast.success(t("pipelineEndorseSubmit") + " ✓");
      onClose();
      setSkillId("");
      setComment("");
    } catch {
      toast.error(t("endorsementFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="size-5 text-accent-foreground" />
            {t("pipelineEndorsePrompt")}
          </DialogTitle>
          <DialogDescription>
            {workerName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="skillId">{t("passportSkills")}</Label>
            <Select value={skillId} onValueChange={setSkillId}>
              <SelectTrigger id="skillId" className="min-h-11 w-full">
                <SelectValue placeholder={t("chooseSkill")} />
              </SelectTrigger>
              <SelectContent>
                {skills.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="comment">{t("verifyReviewerNote")}</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder={t("endorsementPlaceholder")}
              className="min-h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("pipelineEndorseSkip")}
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2 min-h-11">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("pipelineEndorseSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
