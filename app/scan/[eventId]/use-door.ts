"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeTicketCode } from "@/lib/utils";

// The scanner keeps the whole guest list on the device, so the door keeps
// working when the venue network drops. Offline admissions are queued and
// replayed to the server, which stays the single source of truth: if another
// device admitted the same ticket first, the replay reports it as a conflict.

export type Status = "admitted" | "already" | "cancelled" | "not_found" | "event_cancelled";

type Guest = { code: string; name: string; status: "registered" | "cancelled"; checkedInAt: string | null };
type Scan = { code: string; at: string };
type ServerResult = {
  code: string;
  status: Status;
  guest?: { name: string; status: Guest["status"]; checkedInAt: string | null };
};
type Store = { guests: Record<string, Guest>; queue: Scan[]; syncedAt: string | null; eventStatus: string };

export type Outcome =
  | { status: Status; code: string; name?: string; checkedInAt?: string | null; offline?: boolean }
  | { status: "error"; code: string; message: string };

export type Conflict = { code: string; name: string; message: string };

const storageKey = (eventId: string) => `eventpass:scan:${eventId}`;
const emptyStore: Store = { guests: {}, queue: [], syncedAt: null, eventStatus: "published" };

function loadStore(eventId: string): Store {
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    return raw ? { ...emptyStore, ...JSON.parse(raw) } : emptyStore;
  } catch {
    return emptyStore;
  }
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  // A slow venue network shouldn't hold up the line; fall back to offline instead.
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(5000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(response.status, body.error ?? "Something went wrong.");
  return body as T;
}

const sameScan = (a: Scan, b: Scan) => a.code === b.code && a.at === b.at;

export function useDoor(eventId: string) {
  const [store, setStore] = useState<Store>(() => loadStore(eventId));
  const storeRef = useRef(store);
  const [online, setOnline] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const syncing = useRef(false);

  const commit = useCallback(
    (update: (s: Store) => Store) => {
      const next = update(storeRef.current);
      storeRef.current = next;
      try {
        localStorage.setItem(storageKey(eventId), JSON.stringify(next));
      } catch {
        // Storage full or blocked: keep working from memory.
      }
      setStore(next);
    },
    [eventId],
  );

  const applyResults = useCallback(
    (results: ServerResult[]) =>
      commit((s) => {
        const guests = { ...s.guests };
        for (const r of results) if (r.guest) guests[r.code] = { code: r.code, ...r.guest };
        return { ...s, guests };
      }),
    [commit],
  );

  const post = useCallback(
    (scans: Scan[]) =>
      request<{ results: ServerResult[] }>(`/api/scan/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans }),
      }).then((body) => body.results),
    [eventId],
  );

  const handleError = useCallback((error: unknown) => {
    if (error instanceof HttpError) {
      if (error.status === 401 || error.status === 403) setAuthError(error.message);
      return error.message;
    }
    setOnline(false);
    return null;
  }, []);

  /** Replays queued offline scans, then refreshes the guest list. */
  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const batch = storeRef.current.queue.slice(0, 500);
      if (batch.length) {
        const results = await post(batch);
        const found: Conflict[] = [];
        results.forEach((r, i) => {
          const scan = batch[i];
          if (!scan || r.status === "admitted") return;
          // Our own earlier attempt may have landed before the network dropped.
          if (r.status === "already" && r.guest?.checkedInAt === scan.at) return;
          const name = r.guest?.name ?? storeRef.current.guests[scan.code]?.name ?? scan.code;
          const message =
            r.status === "already"
              ? `was already admitted on another device at ${new Date(r.guest?.checkedInAt ?? scan.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. They may have been let in twice.`
              : r.status === "event_cancelled"
                ? "was admitted offline, but the event has been cancelled."
                : "was admitted offline, but their registration had been cancelled.";
          found.push({ code: scan.code, name, message });
        });
        applyResults(results);
        commit((s) => ({ ...s, queue: s.queue.filter((q) => !batch.some((b) => sameScan(b, q))) }));
        if (found.length) setConflicts((c) => [...found, ...c]);
      }

      const snapshot = await request<{ eventStatus: string; guests: Guest[] }>(`/api/scan/${eventId}`);
      commit((s) => {
        // Keep offline admissions that haven't reached the server yet.
        const pending = new Map(s.queue.map((q) => [q.code, q.at]));
        const guests: Record<string, Guest> = {};
        for (const g of snapshot.guests) {
          guests[g.code] = !g.checkedInAt && pending.has(g.code) ? { ...g, checkedInAt: pending.get(g.code) ?? null } : g;
        }
        return { ...s, guests, eventStatus: snapshot.eventStatus, syncedAt: new Date().toISOString() };
      });
      setOnline(true);
      setAuthError(null);
    } catch (error) {
      handleError(error);
    } finally {
      syncing.current = false;
    }
  }, [applyResults, commit, eventId, handleError, post]);

  const scan = useCallback(
    async (input: string): Promise<Outcome> => {
      const code = normalizeTicketCode(input);
      if (!code) return { status: "not_found", code: input };
      const at = new Date().toISOString();

      if (navigator.onLine) {
        try {
          const [result] = await post([{ code, at }]);
          if (result) {
            applyResults([result]);
            setOnline(true);
            return { status: result.status, code, name: result.guest?.name, checkedInAt: result.guest?.checkedInAt };
          }
        } catch (error) {
          const message = handleError(error);
          if (message) return { status: "error", code, message };
        }
      } else {
        setOnline(false);
      }

      // Offline: decide from the guest list on this device.
      const s = storeRef.current;
      const guest = s.guests[code];
      if (!guest) return { status: "not_found", code, offline: true };
      if (s.eventStatus === "cancelled") return { status: "event_cancelled", code, offline: true };
      if (guest.status === "cancelled") return { status: "cancelled", code, name: guest.name, offline: true };
      if (guest.checkedInAt) return { status: "already", code, name: guest.name, checkedInAt: guest.checkedInAt, offline: true };
      commit((prev) => ({
        ...prev,
        queue: [...prev.queue, { code, at }],
        guests: { ...prev.guests, [code]: { ...guest, checkedInAt: at } },
      }));
      return { status: "admitted", code, name: guest.name, offline: true };
    },
    [applyResults, commit, handleError, post],
  );

  useEffect(() => {
    void sync();
    const interval = setInterval(() => void sync(), 15_000);
    const goOnline = () => void sync();
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [sync]);

  const guests = Object.values(store.guests);
  return {
    guests,
    queued: store.queue.length,
    syncedAt: store.syncedAt,
    online,
    authError,
    conflicts,
    dismissConflict: (code: string) => setConflicts((c) => c.filter((x) => x.code !== code)),
    scan,
    sync,
  };
}
