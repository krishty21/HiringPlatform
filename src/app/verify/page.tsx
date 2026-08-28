"use client";
// /verify — worker + employer verification page (VER-01..06).
// Workers see: ID upload dropzone + skill cert upload dropzone (+ skill picker)
//                + list of submitted docs with statuses.
// Employers see: company registration upload dropzone + list of submitted docs.
// VER-06: no raw ID number is ever asked for or stored. Only the file itself.
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppShell } from "@/components/shared/AppShell";
import { UploadDropzone } from "@/components/verification/UploadDropzone";
import { VerificationList } from "@/components/verification/VerificationList";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText } from "lucide-react";

interface SkillRow {
  id: string;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  category: string;
}

export default function VerifyPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as "worker" | "employer" | "admin" | undefined;
  const [skills, setSkills] = useState<SkillRow[] | null>(null);
  const [pickedSkillId, setPickedSkillId] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  // Workers need the skills list to attach a skill cert to a specific skill.
  useEffect(() => {
    if (role !== "worker") return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/skills", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: SkillRow[] };
        if (!cancelled) {
          setSkills(data.items);
          if (data.items[0]) setPickedSkillId(data.items[0].id);
        }
      } catch {}
    };
    setTimeout(load, 0);
    return () => { cancelled = true; };
  }, [role]);

  const pickedSkill = useMemo(
    () => skills?.find((s) => s.id === pickedSkillId),
    [skills, pickedSkillId],
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{t("verifyTitle")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("verifyPiiNote")}</p>
        </header>

        {/* Uploaders */}
        {role === "worker" && (
          <section className="flex flex-col gap-4">
            <UploadDropzone
              docType="id"
              onUploaded={() => setRefreshKey((k) => k + 1)}
            />

            <div className="flex flex-col gap-3">
              {skills === null ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      {t("verifyUploadCert")}
                    </p>
                    <div className="w-56">
                      <Select
                        value={pickedSkillId ?? ""}
                        onValueChange={(v) => setPickedSkillId(v)}
                      >
                        <SelectTrigger className="min-h-11">
                          <SelectValue placeholder={t("search")} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 shramsetu-scroll">
                          {skills.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nameEn} · {s.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="p-4">
                    <UploadDropzone
                      docType="skill_cert"
                      skillId={pickedSkillId}
                      skillName={pickedSkill?.nameEn}
                      disabled={!pickedSkillId}
                      onUploaded={() => setRefreshKey((k) => k + 1)}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {role === "employer" && (
          <section className="flex flex-col gap-4">
            <UploadDropzone
              docType="company"
              onUploaded={() => setRefreshKey((k) => k + 1)}
            />
          </section>
        )}

        {/* Status list */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("verifyTitle")}</h2>
            <Badge variant="outline" className="bg-accent/15 text-accent-foreground border-accent/40">
              {t("verifyMasked")}
            </Badge>
          </div>
          <VerificationList refreshKey={refreshKey} />
        </section>
      </div>
    </AppShell>
  );
}
