"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconScan,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";

import { outcomePresentation } from "@/features/admission/scan-outcome";
import { cn } from "@/lib/utils";

// The hero is the pitch, running. A line of tickets moves through a gate; each
// scan floods the stage with its outcome; the venue Wi-Fi drops mid-loop and
// the line does not stop. Every sentence shown is the scanner's own copy, read
// from `outcomePresentation`, so this cannot drift from what the door says.

type Stamp = "confirmed" | "held" | "repeat" | "refused";

const TONE: Record<Stamp, string> = {
  confirmed: "var(--poster-confirmed)",
  held: "var(--poster-held)",
  repeat: "var(--poster-repeat)",
  refused: "var(--poster-refused)",
};

const STAMP: Record<Stamp, { label: string; className: string }> = {
  confirmed: { label: "IN", className: "text-stamp-confirmed" },
  held: { label: "HELD", className: "text-stamp-held" },
  repeat: { label: "REPEAT", className: "text-stamp-repeat" },
  refused: { label: "NOT FOUND", className: "text-stamp-refused" },
};

const OUTCOME = {
  confirmed: "accepted",
  held: "provisional",
  repeat: "duplicate",
  refused: "unknown",
} as const;

const GUESTS = [
  { name: "Priya Raman", code: "7QM4X–K3B9T" },
  { name: "Amara Okafor", code: "3JD8M–P2K7C" },
  { name: "Leo Martinez", code: "8RW2F–N6Q4A" },
  { name: "Maya Singh", code: "5TC9B–H7X3E" },
  { name: "Tomás Ferreira", code: "2VK6Y–D8R4M" },
  { name: "Hana Sato", code: "9GN3T–W5J2P" },
  { name: "Noor Haddad", code: "4BX7Q–C6F9Z" },
  { name: "Elias Berg", code: "6HM2R–T3V8K" },
  { name: "Zanele Dube", code: "1PD5W–Y7G4N" },
  { name: "Owen Clarke", code: "8FJ9C–M2X6R" },
  { name: "Mei Lin Tan", code: "3WT4H–B9Q7D" },
  { name: "Sofia Rossi", code: "7KY2G–N5P3V" },
];

const CYCLE = GUESTS.length;
// Where the loop drops and restores the signal, as positions in the guest list.
const SIGNAL_DROPS_AT = 6;
const SIGNAL_RETURNS_AT = 0;

const CAPACITY = 240;
const FIRST_ARRIVED = 183;

const TRAVEL_MS = 720;
const DWELL_MS = 1900;

const position = (seq: number) => ((seq % CYCLE) + CYCLE) % CYCLE;
const guestAt = (seq: number) => GUESTS[position(seq)] ?? { name: "", code: "" };

function verdict(seq: number, wifi: boolean): Stamp {
  const at = position(seq);
  if (at === 2) return "repeat";
  if (at === 9) return "refused";
  return wifi ? "confirmed" : "held";
}

type Message = {
  title: string;
  detail: string;
  qualifier?: string;
  guest?: { name: string; code: string };
};

function scanMessage(stamp: Stamp, seq: number): Message {
  const { title, description, qualifier } = outcomePresentation[OUTCOME[stamp]];
  return { title, detail: description, qualifier, guest: guestAt(seq) };
}

function syncMessage(count: number): Message {
  if (count === 0) {
    return {
      title: "Back online",
      detail: "Nothing was waiting on this phone.",
    };
  }
  return {
    title: `${count} ${count === 1 ? "scan" : "scans"} confirmed`,
    detail: "Back online. Everything held on this phone has landed.",
  };
}

type State = {
  cursor: number;
  phase: "moving" | "scanned";
  wifi: boolean;
  /** The loop flips the signal until a visitor takes the switch. */
  scripted: boolean;
  stamps: Record<number, Stamp>;
  arrived: number;
  tone: Stamp;
  previousTone: Stamp;
  floods: number;
  message: Message;
  announcement: string;
};

type Action = { type: "move" } | { type: "scan" } | { type: "toggle-wifi" };

const FIRST_SEQ = CYCLE + 3;

function initialState(): State {
  const stamps: State["stamps"] = {};
  for (let seq = FIRST_SEQ - 6; seq <= FIRST_SEQ; seq += 1) {
    stamps[seq] = verdict(seq, true);
  }
  return {
    cursor: FIRST_SEQ,
    phase: "scanned",
    wifi: true,
    scripted: true,
    stamps,
    arrived: FIRST_ARRIVED,
    tone: "confirmed",
    previousTone: "confirmed",
    floods: 0,
    message: scanMessage("confirmed", FIRST_SEQ),
    announcement: "",
  };
}

function confirmHeld(stamps: State["stamps"]) {
  let count = 0;
  const next: State["stamps"] = {};
  for (const [seq, stamp] of Object.entries(stamps)) {
    if (stamp === "held") count += 1;
    next[Number(seq)] = stamp === "held" ? "confirmed" : stamp;
  }
  return { stamps: next, count };
}

function floodTo(state: State, tone: Stamp) {
  if (tone === state.tone) return {};
  return { tone, previousTone: state.tone, floods: state.floods + 1 };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "move":
      return { ...state, cursor: state.cursor + 1, phase: "moving" };

    case "scan": {
      const seq = state.cursor;
      const at = position(seq);
      let wifi = state.wifi;
      if (state.scripted && at === SIGNAL_DROPS_AT) wifi = false;
      if (state.scripted && at === SIGNAL_RETURNS_AT) wifi = true;

      const reconnected = wifi && !state.wifi;
      const synced = reconnected ? confirmHeld(state.stamps) : null;
      const stamp = verdict(seq, wifi);
      const admitted = stamp === "confirmed" || stamp === "held";
      const arrived = state.arrived + (admitted ? 1 : 0);

      // Keep only what can still be on screen.
      const stamps: State["stamps"] = {};
      for (const [key, value] of Object.entries(synced?.stamps ?? state.stamps)) {
        if (Number(key) > seq - 8) stamps[Number(key)] = value;
      }
      stamps[seq] = stamp;

      return {
        ...state,
        ...floodTo(state, stamp),
        phase: "scanned",
        wifi,
        stamps,
        arrived: arrived >= CAPACITY ? FIRST_ARRIVED : arrived,
        message: synced ? syncMessage(synced.count) : scanMessage(stamp, seq),
      };
    }

    case "toggle-wifi": {
      if (state.wifi) {
        const message = {
          title: "Wi-Fi is off",
          detail: "The line keeps moving. Scans wait on this phone.",
        };
        return {
          ...state,
          ...floodTo(state, "held"),
          wifi: false,
          scripted: false,
          message,
          announcement: `${message.title}. ${message.detail}`,
        };
      }
      const { stamps, count } = confirmHeld(state.stamps);
      const message = syncMessage(count);
      return {
        ...state,
        ...floodTo(state, "confirmed"),
        wifi: true,
        scripted: false,
        stamps,
        message,
        announcement: `${message.title}. ${message.detail}`,
      };
    }
  }
}

// A stable-looking matrix per guest. Decorative: it encodes nothing, and the
// real scannable code is only ever shown on the labelled example ticket below.
function matrixPath(seed: number) {
  const size = 11;
  let bits = Math.imul(seed + 1, 2654435761) >>> 0;
  let path = "";
  const inFinder = (row: number, col: number) =>
    (row < 4 && col < 4) || (row < 4 && col > 6) || (row > 6 && col < 4);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      bits = (Math.imul(bits, 1664525) + 1013904223) >>> 0;
      if (!inFinder(row, col) && bits >>> 31) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  for (const corner of ["0 0", "8 0", "0 8"]) {
    path += `M${corner}h3v3h-3zm1 1v1h1v-1z`;
  }
  return path;
}

function DoorTicket({
  seq,
  slot,
  stamp,
}: {
  seq: number;
  slot: number;
  stamp?: Stamp;
}) {
  const guest = guestAt(seq);
  const path = useMemo(() => matrixPath(position(seq)), [seq]);

  return (
    <div className="door-ticket" style={{ "--slot": slot } as CSSProperties}>
      <div className="ticket-paper flex size-full">
        <div className="relative flex min-w-0 flex-[0_0_72%] flex-col justify-between p-3.5 lg:p-4">
          <p className="truncate text-base font-medium lg:text-lg">
            {guest.name}
          </p>
          <p className="truncate font-mono text-[0.6875rem] tracking-code opacity-70 lg:text-xs">
            {guest.code}
          </p>
          {stamp ? (
            <span
              key={stamp}
              className={cn(
                "door-stamp absolute right-3 bottom-2.5 rounded-sm border-2 border-current px-1.5 py-0.5 text-base leading-none lg:text-lg",
                STAMP[stamp].className,
              )}
            >
              {STAMP[stamp].label}
            </span>
          ) : null}
        </div>
        <div className="perforation-y w-0.5 shrink-0" />
        <div className="flex flex-1 items-center justify-center p-2">
          <svg viewBox="0 0 11 11" className="w-full" shapeRendering="crispEdges">
            <path d={path} fillRule="evenodd" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const stageControl =
  "inline-flex h-11 items-center gap-2 rounded-md border border-poster-ink/50 px-3 text-sm font-medium outline-none transition-colors hover:bg-poster-ink/10 focus-visible:ring-3 focus-visible:ring-poster-ink/40 disabled:opacity-50";

export function DoorStage({
  headline,
  lede,
}: {
  headline: ReactNode;
  lede: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stageRef = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  // null until a visitor chooses, so the default can follow their OS setting.
  const [paused, setPaused] = useState<boolean | null>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const isPaused = paused ?? reducedMotion;
  const running = !isPaused && onScreen;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? true),
      { threshold: 0.15 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // A ticket in transit always lands, even if the line was paused meanwhile.
  useEffect(() => {
    if (state.phase === "moving") {
      const timer = setTimeout(() => dispatch({ type: "scan" }), TRAVEL_MS);
      return () => clearTimeout(timer);
    }
    if (!running) return;
    const timer = setTimeout(() => dispatch({ type: "move" }), DWELL_MS);
    return () => clearTimeout(timer);
  }, [running, state.phase, state.cursor]);

  const { cursor, message, wifi } = state;
  const held = Object.values(state.stamps).filter((s) => s === "held").length;

  const slots: number[] = [];
  for (let seq = cursor - 5; seq <= cursor + 8; seq += 1) slots.push(seq);

  return (
    <section
      ref={stageRef}
      id="door-stage"
      aria-labelledby="stage-heading"
      className="door-stage poster-surface signal-surface relative isolate -mt-18 flex flex-col overflow-clip pt-18 text-poster-ink lg:min-h-svh"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: TONE[state.previousTone] }}
      />
      <div
        key={state.floods}
        aria-hidden="true"
        className={cn("absolute inset-0 -z-10", state.floods > 0 && "door-flood")}
        style={{ background: TONE[state.tone] }}
      />

      {/* Below lg these wrappers dissolve, so the line itself can sit between
          the pitch and the readout and stay inside a phone's first screen. */}
      <div className="mx-auto w-full max-w-[120rem] flex-1 flex-col justify-center gap-7 px-8 pt-6 max-lg:contents lg:flex [@media(max-height:780px)]:gap-4 [@media(max-height:780px)]:pt-1">
        <div className="order-1 px-4 pt-2 sm:px-8 lg:order-none lg:p-0">{headline}</div>

        <div className="grid gap-10 max-lg:contents lg:grid-cols-[minmax(0,1fr)_minmax(0,42%)]">
          <div className="order-2 mt-3 px-4 sm:px-8 lg:order-none lg:m-0 lg:p-0">{lede}</div>

          <div className="order-4 flex flex-col gap-3 px-4 pb-5 sm:px-8 lg:order-none lg:border-l lg:border-poster-ink/25 lg:p-0 lg:pl-8">
            {/* Tall enough for the longest message, so a scan never moves the
                headline above it. */}
            <div className="min-h-34 sm:min-h-28 lg:min-h-37">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <p className="type-answer">{message.title}</p>
                {message.guest ? (
                  <p className="text-lg font-medium">{message.guest.name}</p>
                ) : null}
              </div>
              {message.qualifier ? (
                <p className="mt-1 text-sm font-semibold">{message.qualifier}</p>
              ) : null}
              <p className="mt-1 max-w-md text-sm text-pretty lg:text-base">
                {message.detail}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={wifi}
                aria-label="Venue Wi-Fi"
                onClick={() => dispatch({ type: "toggle-wifi" })}
                className={cn(stageControl, "pr-2.5")}
              >
                {wifi ? (
                  <IconWifi aria-hidden="true" className="size-4" />
                ) : (
                  <IconWifiOff aria-hidden="true" className="size-4" />
                )}
                <span>Venue Wi-Fi {wifi ? "on" : "off"}</span>
                <span className="relative ml-1 h-6 w-11 rounded-full bg-poster-ink/20">
                  <span className="wifi-switch-thumb absolute top-0.5 left-0.5 size-5 rounded-full bg-poster-ink" />
                </span>
              </button>

              <button
                type="button"
                aria-label={isPaused ? "Play the line" : "Pause the line"}
                onClick={() => setPaused(!isPaused)}
                className={cn(stageControl, "w-11 justify-center px-0")}
              >
                {isPaused ? (
                  <IconPlayerPlayFilled aria-hidden="true" className="size-4" />
                ) : (
                  <IconPlayerPauseFilled aria-hidden="true" className="size-4" />
                )}
              </button>

              {isPaused ? (
                <button
                  type="button"
                  disabled={state.phase === "moving"}
                  onClick={() => dispatch({ type: "move" })}
                  className={stageControl}
                >
                  <IconScan aria-hidden="true" className="size-4" />
                  Scan next guest
                </button>
              ) : null}

              <p className="ml-auto text-sm tabular-nums">
                <span className="font-medium">{state.arrived}</span> of{" "}
                {CAPACITY} arrived
                {held > 0 ? (
                  <span className="font-medium">, {held} held</span>
                ) : null}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="h-1 overflow-hidden rounded-full bg-poster-ink/15"
            >
              <div
                className="door-meter h-full bg-poster-ink"
                style={{ transform: `scaleX(${state.arrived / CAPACITY})` }}
              />
            </div>
          </div>
        </div>
      </div>

      <p role="status" className="sr-only">
        {state.announcement}
      </p>

      <div aria-hidden="true" className="door-track order-3 my-1 lg:mt-5 lg:mb-3">
        {slots.map((seq) => (
          <DoorTicket
            key={seq}
            seq={seq}
            slot={cursor - seq}
            stamp={state.stamps[seq]}
          />
        ))}
        <div className="door-gate">
          {state.phase === "scanned" ? (
            <span key={cursor} className="door-beam" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
