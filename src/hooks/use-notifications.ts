"use client";
import { useEffect, useState, useCallback } from "react";

export interface NotificationItem {
  id: string;
  type: "application_status" | "new_match" | "endorsement" | "verification";
  read: boolean;
  createdAt: string;
  payload: Record<string, unknown>;
}

interface NotificationsState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

// Polling notifications hook — directive WRK-10 says poll every 15s.
// Works for any authenticated user (worker or employer).
export function useNotifications(pollMs = 15000): NotificationsState {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationItem[]; unread: number };
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // silent — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    // Best-effort: fire-and-forget PATCH on each unread notification
    const unreadItems = items.filter(i => !i.read);
    await Promise.all(
      unreadItems.map(n =>
        fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => {}),
      ),
    );
    // Optimistically refresh
    await refresh();
  }, [items, refresh]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { items, unread, loading, refresh, markAllRead };
}
