// Notifications helper — insert + list. Polled every 15s by the worker portal.
import { db } from "@/lib/db";

export async function pushNotification(
  userId: string,
  type: "application_status" | "new_match" | "endorsement" | "verification",
  payload: Record<string, unknown>,
) {
  return db.notification.create({
    data: {
      userId,
      type,
      payloadJson: JSON.stringify(payload),
    },
  });
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
