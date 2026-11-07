"use client";

import type { IScannerControls } from "@zxing/browser";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCamera,
  IconCheck,
  IconCloudCheck,
  IconCloudOff,
  IconCloudUpload,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brackets } from "@/app/door-demo";
import { Button, Input, Meter } from "@/components/ui";
import { stockFor } from "@/lib/stock";
import { cn, formatTicketCode } from "@/lib/utils";
import { type Outcome, useDoor } from "./use-door";

type Props = { eventId: string; title: string; timeZone: string; backHref: string };

export default function Scanner({ eventId, title, timeZone, backHref }: Props) {
  const door = useDoor(eventId);
  const [outcome, setOutcome] = useState<{ result: Outcome; seq: number } | null>(null);
  const [showing, setShowing] = useState(false);
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
      setOutcome((prev) => ({ result, seq: (prev?.seq ?? 0) + 1 }));
      setShowing(true);
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
    // The door is usually dark, so the scanner is too, whatever the theme.
    <div data-theme="dark" data-stock={stockFor(eventId)} className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto grid max-w-lg grid-cols-1 content-start gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-fg hover:text-fg"
          >
            <IconArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-faint">Door scanner</p>
            <h1 className="truncate leading-tight font-semibold">{title}</h1>
          </div>
          <SyncPill online={door.online} queued={door.queued} onSync={() => void door.sync()} />
        </header>

        {door.authError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            <IconAlertTriangle aria-hidden className="mt-px size-[1.125rem] shrink-0" />
            <p>
              {door.authError}{" "}
              <a href={`/sign-in?next=/scan/${eventId}`} className="font-semibold underline underline-offset-2">
                Sign in again
              </a>
            </p>
          </div>
        )}

        {door.conflicts.map((c) => (
          <div key={c.code} role="alert" className="flex items-start gap-2.5 rounded-xl bg-warning-soft py-3 pr-2 pl-4 text-sm text-warning">
            <IconAlertTriangle aria-hidden className="mt-px size-[1.125rem] shrink-0" />
            <p className="flex-1">
              <strong>{c.name}</strong> {c.message}
            </p>
            <button
              type="button"
              onClick={() => door.dismissConflict(c.code)}
              aria-label="Dismiss"
              className="-my-1 grid size-8 place-items-center rounded-lg hover:bg-warning/15"
            >
              <IconX className="size-4" />
            </button>
          </div>
        ))}

        <Camera onDecode={admit} busy={busy} />

        <section aria-label="Arrivals" className="grid gap-3">
          <div className="flex items-end justify-between gap-4">
            <p className="display text-6xl leading-none tabular-nums">{arrived}</p>
            <p className="text-right text-sm leading-tight text-muted">
              of <span className="font-semibold text-fg tabular-nums">{registered.length}</span> guests
              <br />
              checked in
            </p>
          </div>
          <Meter value={arrived} max={registered.length} tone="go" label="Guests checked in" />
          {outcome && !showing && <LastScan outcome={outcome.result} onShow={() => setShowing(true)} />}
        </section>

        <section aria-label="Find a guest" className="grid gap-2 border-t border-line pt-5">
          <div className="relative">
            <IconSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a guest by name"
              type="search"
              aria-label="Find a guest by name"
              className="h-12 pl-10"
            />
          </div>
          {query.trim().length >= 2 && matches.length === 0 && (
            <p className="px-1 py-2 text-sm text-muted">No one on the list matches &ldquo;{query.trim()}&rdquo;.</p>
          )}
          {matches.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {matches.map((g) => (
                <li key={g.code} className="flex items-center justify-between gap-3 py-2.5 pr-2.5 pl-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{g.name}</p>
                    <p className="font-mono text-xs text-faint">{formatTicketCode(g.code)}</p>
                  </div>
                  {g.status === "cancelled" ? (
                    <span className="pr-1.5 text-sm font-semibold text-danger">Cancelled</span>
                  ) : g.checkedInAt ? (
                    <span className="pr-1.5 text-sm font-semibold text-success">In at {time(g.checkedInAt)}</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-go text-ink"
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

          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
              void admit(input.value);
              input.value = "";
            }}
          >
            <Input
              name="code"
              placeholder="Or type a ticket code"
              aria-label="Ticket code"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="h-12 min-w-0 font-mono"
            />
            <Button type="submit" variant="secondary" className="h-12" disabled={busy}>
              Check
            </Button>
          </form>
        </section>

        <p className="text-center text-xs text-faint">
          {door.syncedAt
            ? `Guest list saved on this phone · updated ${time(door.syncedAt)}`
            : "Saving the guest list to this phone…"}
        </p>
      </div>

      {outcome && showing && (
        <Verdict key={outcome.seq} outcome={outcome.result} time={time} onDone={() => setShowing(false)} />
      )}
    </div>
  );
}

function SyncPill({ online, queued, onSync }: { online: boolean; queued: number; onSync: () => void }) {
  const Icon = !online ? IconCloudOff : queued > 0 ? IconCloudUpload : IconCloudCheck;
  return (
    <button
      type="button"
      onClick={onSync}
      title="Sync now"
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
        !online ? "bg-warning-soft text-warning" : queued > 0 ? "bg-accent-soft text-accent-text" : "bg-success-soft text-success",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {!online ? (queued > 0 ? `Offline · ${queued} saved` : "Offline") : queued > 0 ? `Syncing ${queued}` : "Online"}
    </button>
  );
}

type Verdict = { go: boolean; headline: string; reason: string | null };

function verdictFor(outcome: Outcome, time: (iso: string) => string): Verdict {
  switch (outcome.status) {
    case "admitted":
      return { go: true, headline: "Admit", reason: outcome.offline ? "Saved on this phone. It syncs when you're back online." : "Checked in" };
    case "already":
      return { go: false, headline: "Stop", reason: outcome.checkedInAt ? `Already checked in at ${time(outcome.checkedInAt)}` : "Already checked in" };
    case "cancelled":
      return { go: false, headline: "Stop", reason: "This registration was cancelled" };
    case "event_cancelled":
      return { go: false, headline: "Stop", reason: "This event is cancelled" };
    case "not_found":
      return {
        go: false,
        headline: "Stop",
        reason: outcome.offline ? "Not on the guest list saved on this phone" : "Not a ticket for this event",
      };
    case "error":
      return { go: false, headline: "Try again", reason: outcome.message };
  }
}

/** The decision, full screen, readable at arm's length. Clears itself; tap to clear sooner. */
function Verdict({ outcome, time, onDone }: { outcome: Outcome; time: (iso: string) => string; onDone: () => void }) {
  const { go, headline, reason } = verdictFor(outcome, time);
  const isError = outcome.status === "error";
  const ms = go ? 1800 : 4500;
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    const timer = setTimeout(() => doneRef.current(), ms);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && doneRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [ms]);

  return (
    <button
      type="button"
      role="alert"
      onClick={onDone}
      className={cn(
        "flood fixed inset-0 z-50 grid w-full cursor-pointer place-content-center px-6 text-center text-ink",
        go ? "bg-go" : isError ? "bg-warning" : "bg-stop",
      )}
    >
      <span className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-ink text-white">
        {go ? <IconCheck className="size-11" stroke={3} /> : isError ? <IconAlertTriangle className="size-10" stroke={2.6} /> : <IconX className="size-11" stroke={3} />}
      </span>
      <span className="display block text-[clamp(3.5rem,16vw,6rem)] leading-none">{headline}</span>
      {"name" in outcome && outcome.name && <span className="mt-3 block text-3xl font-bold text-balance">{outcome.name}</span>}
      {reason && <span className="mt-2 block text-lg font-medium text-balance">{reason}</span>}
      <span className="mt-5 block font-mono text-sm opacity-60">{formatTicketCode(outcome.code)}</span>
      <span className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] text-sm font-semibold opacity-60">
        Tap to continue
      </span>
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1.5 origin-left bg-ink/35"
        style={{ animation: `drain ${ms}ms linear forwards` }}
      />
    </button>
  );
}

function LastScan({ outcome, onShow }: { outcome: Outcome; onShow: () => void }) {
  const go = outcome.status === "admitted";
  const label = { admitted: "Admitted", already: "Already in", cancelled: "Cancelled", not_found: "Not found", event_cancelled: "Event cancelled", error: "Couldn't check" }[outcome.status];
  return (
    <button
      type="button"
      onClick={onShow}
      className="flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-raised"
    >
      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", go ? "bg-go" : "bg-stop")} />
      <span className="text-muted">Last scan</span>
      <span className="min-w-0 flex-1 truncate font-semibold">
        {"name" in outcome && outcome.name ? outcome.name : formatTicketCode(outcome.code)}
      </span>
      <span className={cn("font-semibold", go ? "text-success" : "text-danger")}>{label}</span>
    </button>
  );
}

function Camera({ onDecode, busy }: { onDecode: (text: string) => void; busy: boolean }) {
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

  const live = state === "on" || state === "starting";

  return (
    <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#101010]">
      <video ref={videoRef} className={cn("size-full object-cover", !live && "hidden")} muted playsInline />
      <Brackets className={cn("transition-opacity", live ? "opacity-100" : "opacity-40")} />
      {state === "on" && !busy && (
        <div aria-hidden className="sweep absolute inset-x-[12%] h-0.5 rounded-full bg-white/90 shadow-[0_0_14px_3px_rgb(255_255_255/.45)]" />
      )}

      {!live && (
        <div className="absolute inset-0 grid place-content-center justify-items-center gap-4 px-8 text-center">
          {state === "error" ? (
            <p className="max-w-64 text-sm text-pretty text-muted">
              Couldn&apos;t open the camera. Allow camera access in your browser, or find guests by name below.
            </p>
          ) : (
            <p className="max-w-64 text-sm text-pretty text-muted">Point the camera at a ticket on a phone or on paper.</p>
          )}
          <Button type="button" size="lg" onClick={() => void start()}>
            <IconCamera aria-hidden className="size-5" /> {state === "error" ? "Try again" : "Start camera"}
          </Button>
        </div>
      )}

      {state === "starting" && (
        <p className="absolute inset-0 grid place-items-center text-sm font-medium text-muted">Opening camera…</p>
      )}

      {busy && (
        <p className="absolute inset-x-0 bottom-5 mx-auto w-fit rounded-full bg-black/70 px-3.5 py-1.5 text-sm font-semibold text-white backdrop-blur">
          Checking…
        </p>
      )}

      {state === "on" && (
        <button
          type="button"
          onClick={stop}
          className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/80"
        >
          Stop camera
        </button>
      )}
    </div>
  );
}
