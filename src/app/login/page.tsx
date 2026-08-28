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
import { Loader2 } from "lucide-react";

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
      // Determine redirect based on the demo account role
      const acct = DEMO_LOGINS.find(d => d.id === data.demoId);
      const role = acct?.role;
      router.push(role === "employer" ? "/employer/dashboard" : role === "admin" ? "/admin" : "/home");
    } else {
      // stay on login
      console.warn("login failed", res);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-secondary/40 via-background to-background">
      <header className="px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <span className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm">श्र</span>
          <span>ShramSetu</span>
        </Link>
        <LanguageToggle compact />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("loginEmail")}</CardTitle>
              <CardDescription>{t("loginMagicLink")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t("loginEmail")}</Label>
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
                {busy === "email-only" ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("loginMagicLink")}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground uppercase">{t("loginOr")}</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("demoLoginTitle")}</CardTitle>
              <CardDescription>One-click access — three seeded accounts.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {DEMO_LOGINS.map(d => (
                <Button
                  key={d.id}
                  variant={d.id === "demo-worker" ? "default" : "outline"}
                  onClick={() => signInWith("demo", { demoId: d.id })}
                  disabled={busy === "demo"}
                  className="w-full min-h-12 justify-start gap-3"
                >
                  {busy === "demo" && <Loader2 className="size-4 animate-spin" />}
                  <span className="text-left font-medium">{d.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        {t("footerMission")}
      </footer>
    </div>
  );
}
