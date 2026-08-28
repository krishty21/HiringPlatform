"use client";
// /admin/verifications — admin-only verification queue (ADM-01).
// shadcn Table of pending docs. Click row → AdminQueueItem Sheet (drawer)
// showing preview + extracted fields + approve/reject + reviewer note.
// After action, the row is removed from the pending list.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { AdminQueueItem } from "@/components/verification/AdminQueueItem";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import type { AdminVerificationItem } from "@/components/verification/types";

function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminVerificationsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AdminVerificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AdminVerificationItem | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/verifications?status=pending", { cache: "no-store" });
      if (res.status === 401) throw new Error(t("errUnauthorized"));
      if (res.status === 403) throw new Error(t("errForbidden"));
      if (!res.ok) throw new Error(t("errGeneric"));
      const data = (await res.json()) as { items: AdminVerificationItem[] };
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errGeneric"));
    }
  }, [t]);

  useEffect(() => {
    setTimeout(load, 0);
  }, [load]);

  const onRowClick = (item: AdminVerificationItem) => {
    setActive(item);
    setOpen(true);
  };

  const onActioned = useCallback((id: string, _status: "approved" | "rejected") => {
    setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    setActive(null);
    setOpen(false);
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="min-h-11">
              <Link href="/admin">
                <ArrowLeft className="size-4" />
                {t("back")}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{t("adminQueue")}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="min-h-11">
            <RefreshCw className="size-4" />
            {t("loading")}
          </Button>
        </header>

        {error && (
          <EmptyState icon={FileText} title={error} description="" />
        )}

        {!error && items === null && <LoadingSkeleton count={4} />}

        {!error && items !== null && items.length === 0 && (
          <EmptyState
            icon={FileText}
            title={t("adminQueueEmpty")}
            description="New submissions will appear here for review."
          />
        )}

        {!error && items !== null && items.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-40">Submitted</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-16 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-accent/40 transition-colors"
                    onClick={() => onRowClick(item)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {item.maskedLabel}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.fileType.split("/")[1]?.toUpperCase() ?? item.fileType}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{item.owner.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {item.owner.role}{item.owner.trade ? ` · ${item.owner.trade}` : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatShort(item.submittedAt)}
                    </TableCell>
                    <TableCell>
                      <VerificationBadge
                        status={item.status as "pending" | "approved" | "rejected"}
                        label={
                          item.status === "pending"
                            ? t("verifyStatusPending")
                            : item.status === "approved"
                              ? t("verifyStatusApproved")
                              : t("verifyStatusRejected")
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(item);
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <AdminQueueItem
          item={active}
          open={open}
          onOpenChange={setOpen}
          onActioned={onActioned}
        />
      </div>
    </AppShell>
  );
}
