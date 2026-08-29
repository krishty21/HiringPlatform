"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";
import { Bell, Briefcase, Sparkles, ShieldCheck, FileText, CheckCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: session } = useSession();
  const { items, unread, markAllRead, connection, setUserId, onIncoming } = useNotifications(15000);
  const [open, setOpen] = useState(false);

  // Subscribe to the WebSocket room once we know the user id.
  useEffect(() => {
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    setUserId(uid);
  }, [session, setUserId]);

  function gotoItem(item: NotificationItem) {
    setOpen(false);
    const p = item.payload as Record<string, unknown>;
    if (item.type === "application_status" && typeof p.applicationId === "string") {
      router.push(`/applications/${p.applicationId}`);
    } else if (item.type === "new_match" && typeof p.jobId === "string") {
      router.push(`/jobs/${p.jobId}`);
    } else if (item.type === "rating" && typeof p.candidateId === "string") {
      // Employer ratee → the rated worker's candidate page
      router.push(`/employer/candidates/${p.candidateId}`);
    } else if (item.type === "rating" && typeof p.applicationId === "string") {
      // Worker ratee → the rated application
      router.push(`/applications/${p.applicationId}`);
    } else {
      router.push("/applications");
    }
  }

  // Toast on incoming WS notification (only when popover is closed — open popover
  // already shows the item in the list, no toast needed).
  useEffect(() => {
    return onIncoming((n: NotificationItem) => {
      if (open) return;
      const text = notificationText(n, t);
      const Icon = iconForType(n.type);
      toast(text, {
        duration: 5000,
        action: { label: t("notifView"), onClick: () => gotoItem(n) },
        icon: <Icon className="size-4 text-accent-foreground" />,
      });
    });
  }, [onIncoming, open, t]);

  const connected = connection === "connected";
  const stateLabel = connected ? t("notifStateLive") : connection === "connecting" ? t("notifStateConnecting") : t("notifStatePolling");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative gap-2 min-h-11 px-2"
          aria-label={t("notifTitle")}
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold tabular-nums px-1 animate-in zoom-in-50 duration-200">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">{t("notifTitle")}</DropdownMenuLabel>
          <div className="flex items-center gap-3">
            {/* Real-time connection indicator */}
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
              title={connected ? t("notifWsConnectedTip") : t("notifWsPollingTip")}
            >
              <span className="relative flex size-1.5" aria-hidden>
                {connected && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                )}
                <span className={cn(
                  "relative inline-flex size-1.5 rounded-full",
                  connected ? "bg-emerald-500" : connection === "connecting" ? "bg-amber-500" : "bg-muted-foreground/50",
                )} />
              </span>
              {stateLabel}
            </span>
            {unread > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 px-2"
                onClick={() => { void markAllRead(); }}
              >
                <CheckCheck className="size-3" />
                {t("notifMarkAllRead")}
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="max-h-96">
          <ul className="divide-y divide-border">
            {items.length === 0 && (
              <li className="p-4 text-center text-sm text-muted-foreground">{t("notifEmpty")}</li>
            )}
            {items.map(n => {
              const text = notificationText(n, t);
              const Icon = iconForType(n.type);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => gotoItem(n)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 text-left hover:bg-accent/10 transition-colors",
                      !n.read && "bg-accent/5",
                    )}
                  >
                    <span className={cn(
                      "size-8 rounded-full grid place-items-center shrink-0",
                      n.read ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground",
                    )}>
                      <Icon className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug line-clamp-3">{text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="size-2 rounded-full bg-accent mt-1.5 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function notificationText(n: NotificationItem, t: (k: any, v?: Record<string, string | number>) => string): string {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case "application_status":
      return t("notifApplicationStatus", { status: String(p.stage ?? "") });
    case "new_match":
      return t("notifNewMatch", { score: Number(p.score ?? 0) });
    case "endorsement":
      return t("notifEndorsement", { employer: String(p.companyName ?? ""), skill: String(p.skill ?? "") });
    case "verification":
      return t("notifVerification", { docType: String(p.docType ?? ""), status: String(p.status ?? "") });
    case "rating":
      return t("notifRating", { name: String(p.raterName ?? ""), score: Number(p.score ?? 0) });
    default:
      return "—";
  }
}

function iconForType(type: NotificationItem["type"]) {
  switch (type) {
    case "application_status": return Briefcase;
    case "new_match": return Sparkles;
    case "endorsement": return ShieldCheck;
    case "verification": return FileText;
    case "rating": return Star;
    default: return Bell;
  }
}
