"use client";
// Browser-side WebSocket notifications client.
// Connects to the notifications mini-service via the Caddy gateway using
// io("/?XTransformPort=3003") — never an absolute URL.
import { io, type Socket } from "socket.io-client";

export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";

export interface WsNotificationsHandle {
  state: ConnectionState;
  subscribe: (userId: string) => void;
  onNotification: (cb: (n: unknown) => void) => () => void;
  onHeartbeat: (cb: (hb: { at: string }) => void) => () => void;
  disconnect: () => void;
}

let socket: Socket | null = null;
let currentUserId: string | null = null;
let notificationCbs = new Set<(n: unknown) => void>();
let heartbeatCbs = new Set<(hb: { at: string }) => void>();
let stateListeners = new Set<(s: ConnectionState) => void>();
let currentState: ConnectionState = "idle";

function setState(s: ConnectionState) {
  currentState = s;
  for (const cb of stateListeners) cb(s);
}

function ensureSocket(): Socket {
  if (socket) return socket;
  // NEVER use an absolute URL here — the gateway routes via XTransformPort.
  // In environments where the gateway/mini-service is unavailable, the hook's
  // 15s polling fallback to /api/notifications still delivers notifications.
  socket = io("/?XTransformPort=3003", {
    path: "/",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 20000,
    timeout: 8000,
  });

  socket.on("connect", () => {
    setState("connected");
    if (currentUserId) socket?.emit("subscribe", { userId: currentUserId });
  });
  socket.on("disconnect", () => setState("disconnected"));
  socket.on("connect_error", () => setState("disconnected"));
  socket.on("reconnect_attempt", () => setState("connecting"));
  socket.on("subscribed", () => setState("connected"));
  socket.on("notification", (n: unknown) => {
    for (const cb of notificationCbs) cb(n);
  });
  socket.on("heartbeat", (hb: { at: string }) => {
    for (const cb of heartbeatCbs) cb(hb);
  });

  return socket;
}

export function getWsNotifications(): WsNotificationsHandle {
  return {
    state: currentState,
    subscribe: (userId: string) => {
      currentUserId = userId;
      if (!socket) {
        setState("connecting");
        ensureSocket();
      } else if (socket.connected) {
        socket.emit("subscribe", { userId });
      }
    },
    onNotification: (cb) => {
      notificationCbs.add(cb);
      ensureSocket();
      return () => { notificationCbs.delete(cb); };
    },
    onHeartbeat: (cb) => {
      heartbeatCbs.add(cb);
      ensureSocket();
      return () => { heartbeatCbs.delete(cb); };
    },
    disconnect: () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      notificationCbs.clear();
      heartbeatCbs.clear();
      stateListeners.clear();
      currentUserId = null;
      setState("idle");
    },
  };
}

export function onWsStateChange(cb: (s: ConnectionState) => void): () => void {
  stateListeners.add(cb);
  cb(currentState);
  return () => { stateListeners.delete(cb); };
}

export function getWsState(): ConnectionState {
  return currentState;
}
