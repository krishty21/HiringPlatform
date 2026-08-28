// Server-side relay: a single long-lived socket.io-client connection from the
// Next.js server (port 3000) to the notifications mini-service (port 3003).
// Used by pushNotification() to deliver real-time pings to the user's browser.
//
// NOTE on the gateway rule ("no absolute path in fetch URLs"): that rule
// governs BROWSER→SERVER requests going through Caddy. This is a
// server→server connection on the same machine (127.0.0.1:3003), which is the
// standard pattern the directive explicitly permits ("make cross-origin
// requests without using a proxy"). No browser ever sees this URL.
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

const RELAY_SECRET = process.env.NOTIFICATIONS_WS_SECRET || "dev-insecure";
const WS_URL = process.env.NOTIFICATIONS_WS_URL || "http://127.0.0.1:3003";

function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return Promise.resolve(socket);
  if (connecting) return connecting;

  connecting = new Promise<Socket>((resolve) => {
    const s = io(WS_URL, {
      path: "/",
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 4000,
    });

    s.on("connect", () => {
      console.log("[ws-relay] connected to notifications WS");
      socket = s;
      connecting = null;
      resolve(s);
    });
    s.on("disconnect", () => {
      console.log("[ws-relay] disconnected, will reconnect");
      socket = null;
    });
    s.on("connect_error", (err) => {
      // Mini-service may be down/restarting — degrade gracefully, polling catches up.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ws-relay] connect error:", (err as Error).message);
      }
      socket = null;
    });

    // Don't block forever — if the mini-service is down, resolve with the
    // (still-connecting) socket; relay() will no-op until it's up.
    setTimeout(() => {
      if (!socket) resolve(s);
    }, 1500);
  });

  return connecting;
}

// Fire-and-forget relay. Never throws — notifications are non-critical and
// the 15s polling fallback in use-notifications.ts will eventually deliver.
export async function relayNotification(userId: string, notification: unknown): Promise<void> {
  try {
    const s = await getSocket();
    if (!s.connected) return; // not yet connected; polling fallback will catch up
    s.emit("relay", { secret: RELAY_SECRET, userId, notification }, (res: unknown) => {
      if (process.env.NODE_ENV !== "production" && res && (res as { ok?: boolean }).ok === false) {
        console.warn("[ws-relay] relay rejected:", res);
      }
    });
  } catch {
    // silent — polling fallback covers it
  }
}

// For graceful shutdown / tests.
export function closeRelay(): void {
  if (socket) {
    socket.close();
    socket = null;
  }
}
