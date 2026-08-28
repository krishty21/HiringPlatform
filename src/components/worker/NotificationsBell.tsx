"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";
import { Bell, Briefcase, Sparkles, ShieldCheck, FileText, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { t } = useLanguage();
  const router = useRouter();
  const { items, unread, markAllRead } = useNotifications(15000);
  const [open, setOpen] = useState(false);

  function gotoItem(item: NotificationItem) {
    setOpen(false);
    const p = item.payload as Record<string, unknown>;
    if (item.type === "application_status" && typeof p.applicationId === "string") {
      router.push(`/applications/${p.applicationId}`);
    } else if (item.type === "new_match" && typeof p.jobId === "string") {
      router.push(`/jobs/${p.jobId}`);
    } else {
      router.push("/applications");
    }
  }

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
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold tabular-nums px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">{t("notifTitle")}</DropdownMenuLabel>
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 px-2"
              onClick={() => { void markAllRead(); }}
            >
              <CheckCheck className="size-3" />
              Mark all read
            </Button>
          )}
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
    default: return Bell;
  }
}
