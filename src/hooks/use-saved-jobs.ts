"use client";
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "shramsetu.savedJobs";

/** Stable empty set returned on the server / during hydration. */
const EMPTY_IDS: Set<string> = new Set<string>();

/**
 * Module-level shared store — every useSavedJobs() instance in this tab reads
 * and writes the same Set of saved job ids. A subscriber registry keeps all
 * mounted instances in sync (toggling a bookmark on one card updates every
 * other card, the /home saved-count badge, etc.).
 */
const listeners = new Set<() => void>();
let cachedIds: Set<string> | null = null; // null = not yet read from localStorage

function readFromStorage(): Set<string> {
  if (typeof window === "undefined") return EMPTY_IDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_IDS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_IDS;
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return EMPTY_IDS; // corrupted payload — start clean
  }
}

function writeToStorage(ids: Set<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable (quota / private mode) — in-memory state still works.
  }
}

function ensureLoaded(): Set<string> {
  if (cachedIds === null) cachedIds = readFromStorage();
  return cachedIds;
}

/** Persist the new set and notify every mounted hook instance (optimistic). */
function commitIds(next: Set<string>): void {
  cachedIds = next;
  writeToStorage(next);
  listeners.forEach((notify) => notify());
}

// Cross-tab sync — the `storage` event only fires in OTHER tabs/windows.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    cachedIds = readFromStorage();
    listeners.forEach((fn) => fn());
  });
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

// Stable references are required by useSyncExternalStore: ensureLoaded()
// returns the same Set object until commitIds() swaps in a new one.
function getSnapshot(): Set<string> {
  return ensureLoaded();
}

function getServerSnapshot(): Set<string> {
  return EMPTY_IDS;
}

// `ready` flips false → true once hydrated (server renders false, client true).
function getReadySnapshot(): boolean {
  return true;
}

function getReadyServerSnapshot(): boolean {
  return false;
}

export interface UseSavedJobs {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
  savedCount: number;
  ready: boolean;
}

// Client-side saved-jobs bookmark store (localStorage-backed, NO database).
// Hydration-safe: SSR and the hydration render see the shared EMPTY_IDS set;
// localStorage is only read from getSnapshot() after hydration.
export function useSavedJobs(): UseSavedJobs {
  const savedIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(subscribe, getReadySnapshot, getReadyServerSnapshot);

  // Optimistic toggle: update shared state, persist, notify all instances.
  const toggle = useCallback((id: string) => {
    const next = new Set(ensureLoaded());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commitIds(next);
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return { savedIds, isSaved, toggle, savedCount: savedIds.size, ready };
}
