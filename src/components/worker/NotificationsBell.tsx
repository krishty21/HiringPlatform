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
import {
  Bell, Briefcase, Gauge, ShieldCheck, FileText, CheckCheck, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: session } = useSession();
  const { items, unread, markAllRead, connection, setUserId, onIncoming } = useNotifications(15000);
  const [open, setOpen] = useState(false);

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
      router.push(`/employer/candidates/${p.candidateId}`);
    } else if (item.type === "rating" && typeof p.applicationId === "string") {
      router.push(`/applications/${p.applicationId}`);
    } else {
      router.push("/applications");
    }
  }

  useEffect(() => {
    return onIncoming((n: NotificationItem) => {
      if (open) return;
      const text = notificationText(n, t);
      const Icon = iconForType(n.type);
      toast(text, {
        duration: 5000,
        action: { label: t("notifView"), onClick: () => gotoItem(n) },
        icon: <Icon className="size-4 text-ink-muted" />,
      });
    });
  }, [onIncoming, open, t]);

  const connected = connection === "connected";
  const stateLabel = connected ? t("notifStateLive") : connection === "connecting" ? t("notifStateConnecting") : t("notifStatePolling");

  // Connection indicator — color + shape, no ping
  const dotClass = connected ? "is-positive" : connection === "connecting" ? "is-warning" : "is-neutral";

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
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold tabular-nums px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-ink">
            {t("notifTitle")}
          </DropdownMenuLabel>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1 text-meta text-ink-muted"
              title={connected ? t("notifWsConnectedTip") : t("notifWsPollingTip")}
            >
              <span className={`status-dot ${dotClass}`} aria-hidden />
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
                <CheckCheck className="size-3" aria-hidden />
                {t("notifMarkAllRead")}
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="max-h-96">
          <ul className="divide-y divide-border">
            {items.length === 0 && (
              <li className="p-4 text-center text-sm text-ink-muted">{t("notifEmpty")}</li>
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
                      "w-full flex items-start gap-3 p-3 text-left hover:bg-surface-sunken transition-colors",
                      !n.read && "bg-accent/5",
                    )}
                  >
                    <span
                      className={cn(
                        "size-8 grid place-items-center rounded-md border shrink-0",
                        n.read
                          ? "border-border bg-surface-sunken text-ink-subtle"
                          : "border-accent/30 bg-accent/5 text-ink",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug line-clamp-3 text-ink">{text}</p>
                      <p className="text-meta text-ink-subtle mt-1 tabular-nums">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="status-dot is-warning mt-1.5 shrink-0" aria-hidden />
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
    case "new_match": return Gauge;
    case "endorsement": return ShieldCheck;
    case "verification": return FileText;
    case "rating": return Star;
    default: return Bell;
  }
}
