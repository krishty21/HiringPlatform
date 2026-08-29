"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getWsNotifications,
  onWsStateChange,
  type ConnectionState,
} from "@/lib/notifications/ws-client";

export interface NotificationItem {
  id: string;
  type: "application_status" | "new_match" | "endorsement" | "verification" | "rating";
  read: boolean;
  createdAt: string;
  payload: Record<string, unknown>;
}

interface NotificationsState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  connection: ConnectionState;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  setUserId: (userId: string | null) => void;
  onIncoming: (cb: (n: NotificationItem) => void) => () => void;
}

// Hybrid notifications hook: 15s polling fallback + real-time WebSocket
// delivery via the notifications mini-service on port 3003.
export function useNotifications(pollMs = 15000): NotificationsState {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [userId, setUserId] = useState<string | null>(null);

  // Stable ref to refresh so the WS onIncoming callback always calls the latest.
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const incomingCbsRef = useRef(new Set<(n: NotificationItem) => void>());

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
  refreshRef.current = refresh;

  const markAllRead = useCallback(async () => {
    const unreadItems = items.filter(i => !i.read);
    await Promise.all(
      unreadItems.map(n =>
        fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => {}),
      ),
    );
    await refresh();
  }, [items, refresh]);

  // Subscribe to WS state changes.
  useEffect(() => {
    const unsub = onWsStateChange(setConnection);
    return unsub;
  }, []);

  // When the userId becomes known, subscribe to the mini-service room.
  useEffect(() => {
    if (!userId) return;
    const ws = getWsNotifications();
    ws.subscribe(userId);
  }, [userId]);

  // Listen for incoming WS notifications: refresh the list + fan out to consumers.
  useEffect(() => {
    const ws = getWsNotifications();
    const unsub = ws.onNotification((n) => {
      const item = n as NotificationItem;
      // Eagerly bump unread + prepend item for instant feedback, then refresh
      // to reconcile authoritative state from the DB.
      setUnread(u => Math.min(u + 1, 99));
      setItems(prev => prev.some(p => p.id === item.id) ? prev : [item, ...prev].slice(0, 30));
      for (const cb of incomingCbsRef.current) cb(item);
      void refreshRef.current();
    });
    return unsub;
  }, []);

  // Polling fallback (every 15s) + immediate refresh.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  // Allow callers to react to incoming notifications (e.g., toasts).
  const onIncoming = useCallback((cb: (n: NotificationItem) => void) => {
    incomingCbsRef.current.add(cb);
    return () => { incomingCbsRef.current.delete(cb); };
  }, []);

  return {
    items,
    unread,
    loading,
    connection,
    refresh,
    markAllRead,
    setUserId,
    onIncoming,
  };
}
