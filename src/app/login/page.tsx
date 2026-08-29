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
import { Loader2, HardHat, Building2, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";

const ROLE_ICON: Record<string, typeof HardHat> = {
  worker: HardHat,
  employer: Building2,
  admin: ShieldCheck,
};

type Tab = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"worker" | "employer">("worker");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDemoLogin(demoId: string) {
    setBusy("demo");
    setError("");
    const res = await signIn("demo", { redirect: false, demoId } as any);
    setBusy(null);
    if (res?.ok) {
      const acct = DEMO_LOGINS.find(d => d.id === demoId);
      const r = acct?.role;
      router.push(r === "employer" ? "/employer/dashboard" : r === "admin" ? "/admin" : "/home");
    } else {
      setError("Demo login failed. Please try again.");
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy("signin");
    setError("");
    const res = await signIn("credentials", { redirect: false, email, password } as any);
    setBusy(null);
    if (res?.ok) {
      router.push("/home");
    } else {
      setError("Invalid email or password.");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy("signup");
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      setBusy(null);
      setError(data.error ?? "Registration failed.");
      return;
    }

    // Auto sign-in after registration
    const signInRes = await signIn("credentials", { redirect: false, email, password } as any);
    setBusy(null);
    if (signInRes?.ok) {
      router.push("/home");
    } else {
      setTab("signin");
      setError("Account created! Please sign in.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 px-4 sm:px-6 flex justify-between items-center border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary" aria-label={t("brand")}>
          <span aria-hidden className="size-7 grid place-items-center rounded-md bg-primary text-primary-foreground text-sm">
            JH
          </span>
          <span className="text-base">Jobhunt</span>
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

          {/* Email / Password Card */}
          <Card className="border-border bg-surface">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => { setTab("signin"); setError(""); }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === "signin"
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab("signup"); setError(""); }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === "signup"
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Create Account
              </button>
            </div>

            <CardContent className="pt-5 flex flex-col gap-4">
              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
                {tab === "signup" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name" className="text-xs uppercase tracking-wide text-ink-subtle">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="min-h-11"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wide text-ink-subtle">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-h-11"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wide text-ink-subtle">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={tab === "signup" ? "Min. 8 characters" : "••••••••"}
                      className="min-h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {tab === "signup" && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs uppercase tracking-wide text-ink-subtle">
                      I am a...
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["worker", "employer"] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
                            role === r
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-surface-sunken text-ink-muted hover:border-primary/50"
                          }`}
                        >
                          {r === "worker" ? <HardHat className="size-4" /> : <Building2 className="size-4" />}
                          {r === "worker" ? "Worker" : "Employer"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!email || !password || busy === "signin" || busy === "signup"}
                  className="w-full min-h-11 mt-1"
                >
                  {(busy === "signin" || busy === "signup") && (
                    <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                  )}
                  {tab === "signin" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px bg-border flex-1" />
            <span className="text-xs uppercase tracking-wide text-ink-subtle">or use a demo account</span>
            <div className="h-px bg-border flex-1" />
          </div>

          {/* Demo logins */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ink">{t("demoLoginTitle")}</CardTitle>
              <CardDescription className="text-sm text-ink-muted">{t("loginDemoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {DEMO_LOGINS.map((d) => {
                const RoleIcon = ROLE_ICON[d.role] ?? HardHat;
                const isPrimary = d.id === "demo-worker";
                return (
                  <Button
                    key={d.id}
                    variant={isPrimary ? "default" : "outline"}
                    onClick={() => handleDemoLogin(d.id)}
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
                    <span className="text-left font-medium leading-snug text-sm">{d.label}</span>
                    <ArrowRight className="ml-auto size-4 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden />
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
