"use client";

import type { IScannerControls } from "@zxing/browser";
import { IconCamera, IconCameraOff, IconCloudCheck, IconCloudOff, IconRefresh, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import { cn, formatTicketCode } from "@/lib/utils";
import { type Outcome, useDoor } from "./use-door";

type Props = { eventId: string; title: string; timeZone: string; backHref: string };

export default function Scanner({ eventId, title, timeZone, backHref }: Props) {
  const door = useDoor(eventId);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const busyRef = useRef(false);

  const time = (iso: string) =>
    new Intl.DateTimeFormat([], { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  async function admit(input: string) {
    if (busyRef.current || !input.trim()) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await door.scan(input);
      setOutcome(result);
      navigator.vibrate?.(result.status === "admitted" ? 80 : [200, 100, 200]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const registered = door.guests.filter((g) => g.status === "registered");
  const arrived = registered.filter((g) => g.checkedInAt).length;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return door.guests.filter((g) => g.name.toLowerCase().includes(q) || g.code.includes(q.toUpperCase())).slice(0, 8);
  }, [door.guests, query]);

  return (
    <div className="mx-auto grid min-h-dvh max-w-lg content-start gap-4 px-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={backHref} className="text-sm text-muted hover:text-fg">
            ← Back
          </Link>
          <h1 className="truncate text-lg font-bold">{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => void door.sync()}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
            door.online ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
          )}
        >
          {door.online ? <IconCloudCheck className="size-4" /> : <IconCloudOff className="size-4" />}
          {door.online ? "Online" : "Offline"}
          {door.queued > 0 && ` · ${door.queued} to sync`}
        </button>
      </header>

      {door.authError && (
        <div className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {door.authError}{" "}
          <a href={`/sign-in?next=/scan/${eventId}`} className="font-semibold underline">
            Sign in
          </a>
        </div>
      )}

      {door.conflicts.map((c) => (
        <div key={c.code} className="flex items-start gap-3 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          <p className="flex-1">
            <strong>{c.name}</strong> {c.message}
          </p>
          <button type="button" onClick={() => door.dismissConflict(c.code)} aria-label="Dismiss">
            <IconX className="size-4" />
          </button>
        </div>
      ))}

      <ResultPanel outcome={outcome} busy={busy} time={time} />

      <Camera onDecode={admit} />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
          void admit(input.value);
          input.value = "";
        }}
      >
        <Input name="code" placeholder="Type a ticket code" autoCapitalize="characters" autoComplete="off" className="font-mono" />
        <Button type="submit" variant="secondary" disabled={busy}>
          Check
        </Button>
      </form>

      <div className="grid gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a guest by name" type="search" />
        {matches.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {matches.map((g) => (
              <li key={g.code} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="font-mono text-xs text-muted">{formatTicketCode(g.code)}</p>
                </div>
                {g.status === "cancelled" ? (
                  <span className="text-xs font-semibold text-danger">Cancelled</span>
                ) : g.checkedInAt ? (
                  <span className="text-xs font-semibold text-success">In · {time(g.checkedInAt)}</span>
                ) : (
                  <Button
                    type="button"
                    className="h-8 px-3"
                    disabled={busy}
                    onClick={() => {
                      setQuery("");
                      void admit(g.code);
                    }}
                  >
                    Admit
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="mt-2 flex items-center justify-between text-sm text-muted">
        <span>
          <strong className="text-fg tabular-nums">{arrived}</strong> of {registered.length} checked in
        </span>
        <span className="flex items-center gap-1">
          <IconRefresh className="size-3.5" />
          {door.syncedAt ? `List updated ${time(door.syncedAt)}` : "Downloading list…"}
        </span>
      </footer>
    </div>
  );
}

const COPY: Record<Outcome["status"], { title: string; tone: "ok" | "bad" }> = {
  admitted: { title: "Admit", tone: "ok" },
  already: { title: "Already checked in", tone: "bad" },
  cancelled: { title: "Registration cancelled", tone: "bad" },
  not_found: { title: "Ticket not found", tone: "bad" },
  event_cancelled: { title: "Event cancelled", tone: "bad" },
  error: { title: "Couldn't check", tone: "bad" },
};

function ResultPanel({ outcome, busy, time }: { outcome: Outcome | null; busy: boolean; time: (iso: string) => string }) {
  if (busy) {
    return <div className="grid h-36 place-items-center rounded-2xl bg-subtle text-muted">Checking…</div>;
  }
  if (!outcome) {
    return (
      <div className="grid h-36 place-items-center rounded-2xl border-2 border-dashed border-border text-center text-muted">
        <p>
          Ready to scan
          <br />
          <span className="text-sm">Point the camera at a ticket, or search by name.</span>
        </p>
      </div>
    );
  }

  const { title, tone } = COPY[outcome.status];
  const detail =
    outcome.status === "error"
      ? outcome.message
      : outcome.status === "already" && outcome.checkedInAt
        ? `at ${time(outcome.checkedInAt)}`
        : outcome.status === "not_found"
          ? outcome.offline
            ? "Not on this device's guest list."
            : "This code isn't a ticket for this event."
          : null;

  return (
    <div
      role="status"
      className={cn(
        "grid min-h-36 content-center gap-1 rounded-2xl px-6 py-5 text-center",
        tone === "ok" ? "bg-success text-white" : "bg-danger text-white",
      )}
    >
      <p className="text-sm font-bold tracking-wide uppercase opacity-90">{title}</p>
      {"name" in outcome && outcome.name && <p className="text-3xl font-bold text-balance">{outcome.name}</p>}
      {detail && <p className="text-sm opacity-90">{detail}</p>}
      {"offline" in outcome && outcome.offline && outcome.status === "admitted" && (
        <p className="text-xs opacity-80">Saved on this device · will sync when back online</p>
      )}
      <p className="font-mono text-xs opacity-70">{formatTicketCode(outcome.code)}</p>
    </div>
  );
}

function Camera({ onDecode }: { onDecode: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef({ text: "", at: 0 });
  const onDecodeRef = useRef(onDecode);
  const [state, setState] = useState<"off" | "starting" | "on" | "error">("off");

  useEffect(() => {
    onDecodeRef.current = onDecode;
  });
  useEffect(() => () => controlsRef.current?.stop(), []);

  async function start() {
    if (!videoRef.current) return;
    setState("starting");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      controlsRef.current = await new BrowserQRCodeReader().decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => {
          if (!result) return;
          const text = result.getText();
          const now = Date.now();
          // A ticket stays in frame for a while; only re-read it once it's been away.
          if (text === lastRef.current.text && now - lastRef.current.at < 4000) {
            lastRef.current.at = now;
            return;
          }
          lastRef.current = { text, at: now };
          onDecodeRef.current(text);
        },
      );
      setState("on");
    } catch {
      setState("error");
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setState("off");
  }

  return (
    <div className="grid gap-2">
      <div className={cn("relative overflow-hidden rounded-2xl bg-black", state === "on" || state === "starting" ? "aspect-square" : "hidden")}>
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/70" />
      </div>
      {state === "error" && (
        <p className="text-sm text-danger">Couldn&apos;t open the camera. Allow camera access, or type codes and search by name.</p>
      )}
      {state === "on" || state === "starting" ? (
        <Button type="button" variant="secondary" onClick={stop}>
          <IconCameraOff className="size-4" /> Stop camera
        </Button>
      ) : (
        <Button type="button" onClick={() => void start()} className="h-12 text-base">
          <IconCamera className="size-5" /> Start camera
        </Button>
      )}
    </div>
  );
}
