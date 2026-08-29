// Notifications helper — insert + list + real-time relay.
// WRK-10: the worker portal polls every 15s as a fallback; on top of that,
// pushNotification() also fires the WS relay so connected browsers receive
// the notification instantly (sub-second latency).
import { db } from "@/lib/db";
import { relayNotification } from "./ws-relay";

export type NotificationType = "application_status" | "new_match" | "endorsement" | "verification" | "rating";

export async function pushNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
) {
  const row = await db.notification.create({
    data: {
      userId,
      type,
      payloadJson: JSON.stringify(payload),
    },
  });

  // Fire-and-forget real-time relay to the mini-service. Non-blocking; if the
  // mini-service is down the 15s polling fallback in use-notifications.ts
  // still delivers the row.
  const notification = {
    id: row.id,
    type: row.type,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
    payload,
  };
  void relayNotification(userId, notification).catch(() => {});

  return row;
}

export async function listNotifications(userId: string, opts?: { limit?: number; unreadOnly?: boolean }) {
  return db.notification.findMany({
    where: {
      userId,
      ...(opts?.unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}
