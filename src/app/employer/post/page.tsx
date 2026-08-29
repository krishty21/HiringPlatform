"use client";
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
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("postJobTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("postJobUrgentHelp")}
        </p>
      </header>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {t("errGeneric")}
          </CardContent>
        </Card>
      )}

      {!skills && !error && <LoadingSkeleton count={3} />}
      {skills && skills.length > 0 && <JobPostForm skills={skills} />}
    </AppShell>
  );
}
