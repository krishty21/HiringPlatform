"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { DEMO_LOGINS } from "@/lib/auth";
import { Loader2, HardHat, Building2, ShieldCheck, ArrowRight, Send } from "lucide-react";

// Role-aware icon — color stays neutral; differentiation is icon + label, not color
const ROLE_ICON: Record<string, typeof HardHat> = {
  worker: HardHat,
  employer: Building2,
  admin: ShieldCheck,
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function signInWith(provider: string, data: Record<string, string>) {
    setBusy(provider);
    const res = await signIn(provider, { redirect: false, ...data } as any);
    setBusy(null);
    if (res?.ok) {
      const acct = DEMO_LOGINS.find(d => d.id === data.demoId);
      const role = acct?.role;
      router.push(role === "employer" ? "/employer/dashboard" : role === "admin" ? "/admin" : "/home");
    } else {
      console.warn("login failed", res);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 px-4 sm:px-6 flex justify-between items-center border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-primary"
          aria-label={t("brand")}
        >
          <span
            aria-hidden
            className="size-7 grid place-items-center rounded-md bg-primary text-primary-foreground text-sm"
          >
            श्र
          </span>
          <span className="text-base">ShramSetu</span>
        </Link>
        <LanguageToggle compact />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance">
              {t("loginTitle")}
            </h1>
          </div>

          {/* Email magic-link card */}
          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-ink">
                {t("loginEmail")}
              </CardTitle>
              <CardDescription className="text-sm text-ink-muted">
                {t("loginMagicLink")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("loginEmail")}
                </Label>
                <Input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-h-11"
                />
              </div>
              <Button
                onClick={() => signInWith("email-only", { email })}
                disabled={!email || busy === "email-only"}
                className="w-full min-h-11 gap-2"
              >
                {busy === "email-only" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                {t("loginMagicLink")}
              </Button>
            </CardContent>
          </Card>

          {/* Divider — single hairline, no gradient */}
          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px bg-border flex-1" />
            <span className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("loginOr")}
            </span>
            <div className="h-px bg-border flex-1" />
          </div>

          {/* Demo logins — neutral, role differentiation via icon+label */}
          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-ink">
                {t("demoLoginTitle")}
              </CardTitle>
              <CardDescription className="text-sm text-ink-muted">
                {t("loginDemoDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {DEMO_LOGINS.map((d) => {
                const RoleIcon = ROLE_ICON[d.role] ?? HardHat;
                const isPrimary = d.id === "demo-worker";
                return (
                  <Button
                    key={d.id}
                    variant={isPrimary ? "default" : "outline"}
                    onClick={() => signInWith("demo", { demoId: d.id })}
                    disabled={busy === "demo"}
                    className="group w-full min-h-12 justify-start gap-3 h-auto py-2"
                  >
                    {busy === "demo" ? (
                      <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
                    ) : (
                      <span
                        aria-hidden
                        className={`grid size-7 shrink-0 place-items-center rounded-md border ${
                          isPrimary
                            ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
                            : "border-border bg-surface-sunken text-ink-muted"
                        }`}
                      >
                        <RoleIcon className="size-3.5" />
                      </span>
                    )}
                    <span className="text-left font-medium leading-snug text-sm">
                      {d.label}
                    </span>
                    <ArrowRight
                      className="ml-auto size-4 shrink-0 opacity-60 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="px-4 py-5 text-center border-t border-border bg-surface-sunken">
        <p className="text-meta text-ink-muted max-w-2xl mx-auto text-pretty">
          {t("footerMission")}
        </p>
      </footer>
    </div>
  );
}
