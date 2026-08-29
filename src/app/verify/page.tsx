"use client";
// /verify — credential infrastructure (Master Prompt §33).
// Workers: upload government ID + skill certificate (+ skill picker) +
//           list of submitted docs with statuses (Identity Verified / Skills
//           Verified / Documents pending).
// Employers: upload company registration + list of submitted docs.
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
import {
  ShieldCheck, FileText, IdCard, Award, Check, Clock,
} from "lucide-react";

interface SkillRow {
  id: string;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  category: string;
}

interface VerifySummary {
  idApproved: boolean;
  skillApprovedCount: number;
  totalSkillCount: number;
  pendingCount: number;
  rejectedCount: number;
}

// Derive the worker's verification summary from the VerificationList data.
// Fetches the doc list directly (the VerificationList component fetches the
// same endpoint; we fetch here for the headline counts).
function useVerificationSummary(refreshKey: number): VerifySummary | null {
  const [summary, setSummary] = useState<VerifySummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/verifications", { cache: "no-store" });
        if (!res.ok) { if (!cancelled) setSummary(null); return; }
        const data = (await res.json()) as { items?: Array<{ docType: string; status: string; skill?: { nameEn?: string } | null }> };
        if (cancelled) return;
        const items = data.items ?? [];
        const idApproved = items.some(d => d.docType === "id" && d.status === "approved");
        const skillDocs = items.filter(d => d.docType === "skill_cert");
        const skillApprovedCount = skillDocs.filter(d => d.status === "approved").length;
        const pendingCount = items.filter(d => d.status === "pending").length;
        const rejectedCount = items.filter(d => d.status === "rejected").length;
        setSummary({
          idApproved,
          skillApprovedCount,
          totalSkillCount: skillDocs.length,
          pendingCount,
          rejectedCount,
        });
      } catch {
        if (!cancelled) setSummary(null);
      }
    };
    setTimeout(load, 0);
    return () => { cancelled = true; };
  }, [refreshKey]);
  return summary;
}

export default function VerifyPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as "worker" | "employer" | "admin" | undefined;
  const [skills, setSkills] = useState<SkillRow[] | null>(null);
  const [mySkillIds, setMySkillIds] = useState<Set<string>>(new Set());
  const [pickedSkillId, setPickedSkillId] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const summary = useVerificationSummary(refreshKey);

  useEffect(() => {
    if (role !== "worker") return;
    let cancelled = false;
    const load = async () => {
      try {
        const [skillsRes, profileRes] = await Promise.all([
          fetch("/api/skills", { cache: "no-store" }),
          fetch("/api/worker/profile", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        let ownIds: Set<string> = new Set();
        if (profileRes.ok) {
          const profile = (await profileRes.json()) as { skills?: { skillId: string }[] };
          ownIds = new Set((profile.skills ?? []).map(s => s.skillId));
        }
        setMySkillIds(ownIds);
        if (skillsRes.ok) {
          const data = (await skillsRes.json()) as { items: SkillRow[] };
          if (cancelled) return;
          const sorted = [...data.items].sort((a, b) => {
            const aOwn = ownIds.has(a.id) ? 0 : 1;
            const bOwn = ownIds.has(b.id) ? 0 : 1;
            return aOwn - bOwn;
          });
          setSkills(sorted);
          const firstOwn = sorted.find(s => ownIds.has(s.id));
          setPickedSkillId((firstOwn ?? sorted[0])?.id);
        } else {
          setSkills([]);
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
        {/* Header — credential infrastructure feel */}
        <header className="flex flex-col gap-2">
          <p className="text-meta uppercase tracking-wider text-ink-subtle">
            {t("verifyTitle")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance">
            {t("verifyTitle")}
          </h1>
          <p className="text-sm text-ink-muted text-pretty">
            {t("verifyPiiNote")}
          </p>
        </header>

        {/* Status strip — dl with verified/pending counts (workers only) */}
        {role === "worker" && summary && (
          <section className="surface-raised rounded-md p-4 sm:p-5 shadow-raise" aria-label={t("verifyStatusSummaryAria")}>
            <dl className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
                  <IdCard className="size-3.5" aria-hidden />
                  {t("verifyStatusId")}
                </dt>
                <dd className="text-sm font-medium">
                  {summary.idApproved ? (
                    <span className="inline-flex items-center gap-1.5 text-positive">
                      <Check className="size-4" aria-hidden />
                      {t("verifyStatusApproved")}
                    </span>
                  ) : (
                    <span className="text-ink-subtle">{t("verifyStatusPending")}</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
                  <Award className="size-3.5" aria-hidden />
                  {t("verifyStatusSkills")}
                </dt>
                <dd className="text-sm font-medium text-ink tabular-nums">
                  {summary.skillApprovedCount}/{summary.totalSkillCount}{" "}
                  <span className="text-ink-subtle font-normal">{t("verifyStatusApproved").toLowerCase()}</span>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden />
                  {t("verifyStatusDocs")}
                </dt>
                <dd className="text-sm font-medium text-ink tabular-nums">
                  {summary.pendingCount}
                  <span className="text-ink-subtle font-normal"> {t("verifyStatusPending").toLowerCase()}</span>
                </dd>
              </div>
            </dl>
          </section>
        )}

        {/* Uploaders — grouped, professional, with helpful descriptions */}
        {role === "worker" && (
          <section className="flex flex-col gap-4">
            <section className="surface-raised rounded-md overflow-hidden shadow-raise">
              <header className="px-4 py-3 border-b border-border flex items-center gap-2">
                <IdCard className="size-4 text-ink-muted" aria-hidden />
                <h2 className="text-sm font-semibold text-ink">
                  {t("verifyUploadId")}
                </h2>
              </header>
              <div className="p-4">
                <p className="text-meta text-ink-muted mb-3 leading-relaxed">
                  {t("verifyUploadIdHint")}
                </p>
                <UploadDropzone
                  docType="id"
                  onUploaded={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            </section>

            <section className="surface-raised rounded-md overflow-hidden shadow-raise">
              <header className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <FileText className="size-4 text-ink-muted" aria-hidden />
                  {t("verifyUploadCert")}
                </h2>
                <div className="w-56">
                  {skills === null ? (
                    <Skeleton className="h-11 w-full" />
                  ) : (
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
                            <span className="inline-flex items-center gap-1.5">
                              {mySkillIds.has(s.id) && (
                                <Check className="size-3.5 text-positive" aria-hidden />
                              )}
                              {s.nameEn} · {s.category}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </header>
              <div className="p-4">
                <p className="text-meta text-ink-muted mb-3 leading-relaxed">
                  {t("verifyUploadCertHint")}
                </p>
                <UploadDropzone
                  docType="skill_cert"
                  skillId={pickedSkillId}
                  skillName={pickedSkill?.nameEn}
                  disabled={!pickedSkillId}
                  onUploaded={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            </section>
          </section>
        )}

        {role === "employer" && (
          <section className="flex flex-col gap-4">
            <section className="surface-raised rounded-md overflow-hidden shadow-raise">
              <header className="px-4 py-3 border-b border-border flex items-center gap-2">
                <ShieldCheck className="size-4 text-ink-muted" aria-hidden />
                <h2 className="text-sm font-semibold text-ink">
                  {t("verifyUploadCompany")}
                </h2>
              </header>
              <div className="p-4">
                <UploadDropzone
                  docType="company"
                  onUploaded={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            </section>
          </section>
        )}

        {/* Submitted documents list */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-ink">
              {t("verifyDocsListLabel")}
            </h2>
            <span className="trust-pill is-verified">
              <ShieldCheck className="size-3.5" aria-hidden />
              {t("verifyMasked")}
            </span>
          </div>
          <VerificationList refreshKey={refreshKey} />
        </section>
      </div>
    </AppShell>
  );
}
