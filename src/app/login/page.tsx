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
import { Loader2, HardHat, Building2, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

// Role-aware icon + tint for each demo account (auth.ts is frozen —
// the mapping lives here so the buttons feel crafted, not generic).
const ROLE_META: Record<string, { icon: typeof HardHat; chip: string; iconClass: string }> = {
  worker: {
    icon: HardHat,
    chip: "border-emerald-200 bg-emerald-50",
    iconClass: "text-emerald-700",
  },
  employer: {
    icon: Building2,
    chip: "border-sky-200 bg-sky-50",
    iconClass: "text-sky-700",
  },
  admin: {
    icon: ShieldCheck,
    chip: "border-amber-200 bg-amber-50",
    iconClass: "text-amber-700",
  },
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
        <Link href="/" className="flex items-center gap-2 font-bold text-primary transition-opacity hover:opacity-85">
          <span className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm">श्र</span>
          <span>ShramSetu</span>
        </Link>
        <LanguageToggle compact />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          >
            <Card className="relative overflow-hidden">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
              />
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
                  {busy === "email-only" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" aria-hidden />}
                  {t("loginMagicLink")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.16 }}
            className="flex items-center gap-3"
          >
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground uppercase">{t("loginOr")}</span>
            <div className="h-px bg-border flex-1" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.22, ease: "easeOut" }}
          >
            <Card className="relative overflow-hidden">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
              />
              <CardHeader>
                <CardTitle>{t("demoLoginTitle")}</CardTitle>
                <CardDescription>{t("loginDemoDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {DEMO_LOGINS.map((d, idx) => {
                  const meta = ROLE_META[d.role] ?? ROLE_META.worker;
                  const RoleIcon = meta.icon;
                  const isPrimary = d.id === "demo-worker";
                  return (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.26 + idx * 0.07 }}
                    >
                      <Button
                        variant={isPrimary ? "default" : "outline"}
                        onClick={() => signInWith("demo", { demoId: d.id })}
                        disabled={busy === "demo"}
                        className="group w-full min-h-12 justify-start gap-3 h-auto py-2 transition-transform active:scale-[0.99]"
                      >
                        {busy === "demo" ? (
                          <Loader2 className="size-4 animate-spin shrink-0" />
                        ) : (
                          <span
                            aria-hidden
                            className={`grid size-8 shrink-0 place-items-center rounded-full border ${isPrimary ? "border-primary-foreground/25 bg-primary-foreground/10" : meta.chip}`}
                          >
                            <RoleIcon className={`size-4 ${isPrimary ? "text-primary-foreground" : meta.iconClass}`} />
                          </span>
                        )}
                        <span className="text-left font-medium leading-snug">{d.label}</span>
                        <ArrowRight
                          className="ml-auto size-4 shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-70 group-hover:translate-x-0"
                          aria-hidden
                        />
                      </Button>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        {t("footerMission")}
      </footer>
    </div>
  );
}
