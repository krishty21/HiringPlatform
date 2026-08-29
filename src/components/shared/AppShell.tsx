"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { AIDemoModeIndicator } from "./AIDemoModeIndicator";
import { LanguageToggle } from "./LanguageToggle";
import {
  Home, User, Briefcase, Bell, FileText,
  LayoutDashboard, Users, Settings, ShieldAlert, LogOut, Plus, Search, Menu,
} from "lucide-react";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

type NavItem = { href: string; labelKey: any; icon: typeof Home };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  // Mobile nav sheet (round 13): employers/admins had NO navigation on mobile —
  // the sidebar is `hidden md:flex` and only workers get the bottom tab bar.
  // This hamburger sheet restores reachability for every non-worker role.
  const [navOpen, setNavOpen] = useState(false);
  const role = (session?.user as any)?.role as "worker" | "employer" | "admin" | undefined;
  const isPublic = pathname === "/" || pathname?.startsWith("/c/") || pathname?.startsWith("/login");

  // Wait for session check; if unauthenticated, redirect to /login
  // Must be called BEFORE any conditional return — rules of hooks.
  useEffect(() => {
    if (status === "unauthenticated" && !isPublic) router.replace("/login");
  }, [status, router, isPublic]);

  // Public routes don't use the shell
  if (isPublic) return <>{children}</>;

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const workerNav: NavItem[] = [
    { href: "/home", labelKey: "navHome", icon: Home },
    { href: "/jobs", labelKey: "navBrowse", icon: Search },
    { href: "/applications", labelKey: "navApplications", icon: Briefcase },
    { href: "/profile", labelKey: "navProfile", icon: User },
  ];

  const employerNav: NavItem[] = [
    { href: "/employer/dashboard", labelKey: "navDashboard", icon: LayoutDashboard },
    { href: "/employer/post", labelKey: "navPostJob", icon: Plus },
    { href: "/employer/jobs", labelKey: "navMyJobs", icon: Briefcase },
    { href: "/employer/candidates", labelKey: "navCandidates", icon: Search },
    { href: "/employer/pipeline", labelKey: "navPipeline", icon: Users },
  ];

  const adminNav: NavItem[] = [
    { href: "/admin", labelKey: "navDashboard", icon: LayoutDashboard },
    { href: "/admin/verifications", labelKey: "navVerify", icon: ShieldAlert },
  ];

  const nav = role === "employer" ? employerNav : role === "admin" ? adminNav : workerNav;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const mobile = role === "worker"; // workers get bottom tab bar; everyone else gets sidebar on mobile too via sheet
  const showBottomBar = mobile; // mobile worker = bottom tab bar per SRD §11

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href={role === "worker" ? "/home" : role === "employer" ? "/employer/dashboard" : "/admin"} className="flex items-center gap-2 font-bold text-primary">
            <span className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm">श्र</span>
            <span className="text-base hidden sm:inline">ShramSetu</span>
          </Link>
          <div className="flex items-center gap-2">
            {!showBottomBar && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground hover:text-foreground size-10"
                onClick={() => setNavOpen(true)}
                aria-label={t("navMenuAria")}
                aria-haspopup="dialog"
              >
                <Menu className="size-5" />
              </Button>
            )}
            <AIDemoModeIndicator />
            <LanguageToggle compact />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={async () => {
                // Client-side signout with relative navigation — avoids NextAuth's
                // absolute-URL redirect (localhost:3000) which breaks behind the
                // Caddy gateway proxy.
                await signOut({ redirect: false });
                router.push("/");
                router.refresh();
              }}
              aria-label={t("navLogout")}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{t("navLogout")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Body: sidebar (desktop) + main */}
      <div className="flex-1 flex mx-auto w-full max-w-7xl">
        {!showBottomBar && (
          <aside className="hidden md:flex md:w-56 lg:w-64 border-r border-border bg-card flex-col py-4 px-3 gap-1">
            {nav.map(item => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-11 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </aside>
        )}

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 md:pb-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      {/* Mobile nav sheet (employer/admin) — slide-in drawer with the same
          items as the desktop sidebar; closes on route change (effect above). */}
      {!showBottomBar && (
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="px-4 py-4 border-b border-border bg-secondary/30">
              <SheetTitle className="text-base flex items-center gap-2 text-primary">
                <span className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm">श्र</span>
                ShramSetu
              </SheetTitle>
              <SheetDescription className="sr-only">{t("navMenuAria")}</SheetDescription>
            </SheetHeader>
            <nav className="flex-1 flex flex-col gap-1 p-3" aria-label="Mobile">
              {nav.map(item => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-11 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  >
                    <Icon className="size-5" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground min-h-11"
                onClick={async () => {
                  setNavOpen(false);
                  await signOut({ redirect: false });
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut className="size-5" />
                {t("navLogout")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Bottom tab bar (mobile worker) */}
      {showBottomBar && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75" aria-label="Primary">
          <ul className="flex justify-around items-stretch h-16 safe-area-inset-bottom">
            {nav.map(item => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center justify-center gap-1 h-full text-xs font-medium min-h-12 ${active ? "text-primary" : "text-muted-foreground"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-5" />
                    <span className="text-[10px] leading-none">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 text-xs text-muted-foreground text-center">
          {t("footerMission")}
        </div>
      </footer>
    </div>
  );
}
