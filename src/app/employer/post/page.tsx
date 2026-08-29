"use client";
// /employer/post — Master Prompt §64: form UX. Clear labels, useful descriptions,
// grouped fields, logical progression, mobile-friendly controls.
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { JobPostForm } from "@/components/employer/JobPostForm";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Skill } from "@/lib/schemas";

export default function PostJobPage() {
  const { t } = useLanguage();
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then((data: { items: Skill[] }) => setSkills(data.items ?? []))
      .catch(() => setError(true));
  }, []);

  return (
    <AppShell>
      <main className="flex flex-col gap-6 max-w-3xl mx-auto">
        {/* Header — border-b sectioned */}
        <header className="border-b border-border pb-4">
          <p className="text-meta uppercase tracking-wide text-ink-subtle">
            {t("postJobEyebrow")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t("postJobTitle")}
          </h1>
          <p className="text-meta text-ink-subtle mt-1">
            {t("postJobSubtitle")}
          </p>
        </header>

        {error && (
          <Card className="surface-raised shadow-raise border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              {t("errGeneric")}
            </CardContent>
          </Card>
        )}

        {!skills && !error && <LoadingSkeleton count={3} />}
        {skills && skills.length > 0 && <JobPostForm skills={skills} />}
      </main>
    </AppShell>
  );
}
