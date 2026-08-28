// ShramSetu notifications WebSocket mini-service (port 3003).
// Clients (browser) connect via Caddy gateway: io("/?XTransformPort=3003").
// The Next.js server connects internally (socket.io-client to 127.0.0.1:3003)
// and emits "relay" events to push notifications into user rooms in real time.
//
// NOTE: socket.io is attached with path "/" (required by Caddy), which means
// socket.io owns all HTTP routes on this port — so there are NO HTTP routes
// here. All control plane (relay, subscribe, heartbeat) is via socket.io events.
import { createServer } from "node:http";
import { Server } from "socket.io";

const PORT = 3003;
const RELAY_SECRET = process.env.NOTIFICATIONS_WS_SECRET || "dev-insecure";

const httpServer = createServer();
const io = new Server(httpServer, {
  // Path MUST be "/" — Caddy forwards "/?XTransformPort=3003" to this service.
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Per-room connection counts (observability).
const roomCounts = new Map<string, number>();

function bump(room: string, delta: number) {
  const next = (roomCounts.get(room) ?? 0) + delta;
  if (next <= 0) roomCounts.delete(room);
  else roomCounts.set(room, next);
}

io.on("connection", (socket) => {
  console.log(`[ws] connected socket=${socket.id}`);

  // Browser client subscribes to its own notification room.
  socket.on("subscribe", (payload: { userId?: string }) => {
    const userId = payload?.userId;
    if (!userId || typeof userId !== "string") return;
    const room = `user:${userId}`;
    socket.join(room);
    bump(room, 1);
    socket.data.userId = userId;
    socket.emit("subscribed", { room, at: new Date().toISOString() });
    console.log(`[ws] socket=${socket.id} subscribed ${room} (total=${roomCounts.get(room)})`);
  });

  // Internal relay — the Next.js server emits this when pushNotification fires.
  // Authenticated via a shared secret to prevent abuse by untrusted clients.
  socket.on("relay", (payload: { secret?: string; userId?: string; notification?: unknown }, ack?: (r: unknown) => void) => {
    if (payload?.secret !== RELAY_SECRET) {
      ack?.({ ok: false, error: "UNAUTHORIZED" });
      return;
    }
    const { userId, notification } = payload;
    if (!userId || !notification) {
      ack?.({ ok: false, error: "BAD_REQUEST" });
      return;
    }
    io.to(`user:${userId}`).emit("notification", notification);
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const room = socket.data.userId ? `user:${socket.data.userId}` : null;
    if (room) {
      bump(room, -1);
      console.log(`[ws] socket=${socket.id} left ${room} (remaining=${roomCounts.get(room) ?? 0})`);
    }
  });

  socket.on("error", (err: unknown) => console.error(`[ws] socket error ${socket.id}:`, err));
});

// Heartbeat every 30s — clients use this to render a "Live · connected" indicator.
setInterval(() => {
  io.emit("heartbeat", { at: new Date().toISOString() });
}, 30000);

httpServer.listen(PORT, () => {
  console.log(`[ws] ShramSetu notifications WS listening on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[ws] SIGTERM, closing server…");
  io.close(() => httpServer.close(() => process.exit(0)));
});
process.on("SIGINT", () => {
  console.log("[ws] SIGINT, closing server…");
  io.close(() => httpServer.close(() => process.exit(0)));
});
