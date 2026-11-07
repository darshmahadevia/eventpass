"use client";

import { IconCheck, IconPlayerPlay, IconWifi, IconWifiOff, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import type { Stock } from "@/lib/stock";
import { cn } from "@/lib/utils";

const LINE: { name: string; stock: Stock; verdict: "admit" | "stop" }[] = [
  { name: "Maya Okafor", stock: "rose", verdict: "admit" },
  { name: "Theo Silva", stock: "rose", verdict: "admit" },
  { name: "Ruby Chen", stock: "rose", verdict: "admit" },
  { name: "Theo Silva", stock: "rose", verdict: "stop" },
  { name: "Omar Haddad", stock: "rose", verdict: "admit" },
  { name: "Nora Larsen", stock: "rose", verdict: "admit" },
  { name: "Sam Ito", stock: "sky", verdict: "stop" },
];

const calmMedia = "(prefers-reduced-motion: reduce)";
const subscribeCalm = (notify: () => void) => {
  const media = matchMedia(calmMedia);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

/**
 * The product's whole argument, playable: tickets keep getting scanned, and the
 * Wi-Fi switch shows admissions queueing on the phone and syncing when it returns.
 */
export function DoorDemo({ qr }: { qr: string }) {
  const calm = useSyncExternalStore(subscribeCalm, () => matchMedia(calmMedia).matches, () => false);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [inside, setInside] = useState(31);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "scanning" | "result" | "leaving">("waiting");
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const onlineRef = useRef(online);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.3 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  const guest = LINE[turn % LINE.length]!;

  useEffect(() => {
    if (!visible) return;
    if (phase === "waiting" && calm) return; // waits for the "Scan next ticket" button
    const wait = { waiting: 450, scanning: 1100, result: 1250, leaving: 420 }[phase];
    const timer = setTimeout(() => {
      if (phase === "waiting") setPhase("scanning");
      if (phase === "scanning") {
        setPhase("result");
        if (guest.verdict === "admit") {
          setInside((n) => (n >= 79 ? 31 : n + 1));
          if (!onlineRef.current) setQueued((n) => n + 1);
        }
      }
      if (phase === "result") setPhase("leaving");
      if (phase === "leaving") {
        setPhase("waiting");
        setTurn((n) => n + 1);
      }
    }, wait);
    return () => clearTimeout(timer);
  }, [phase, visible, calm, guest.verdict]);

  // Back online, the queue drains to the server one scan at a time.
  useEffect(() => {
    if (!online || queued === 0) return;
    const timer = setTimeout(() => setQueued((n) => n - 1), 420);
    return () => clearTimeout(timer);
  }, [online, queued]);

  const admit = guest.verdict === "admit";
  const decided = phase === "result" || phase === "leaving";
  const framed = phase === "scanning" || phase === "result";

  return (
    <div ref={root} className="rise mx-auto grid w-full max-w-[21.5rem] gap-4 [--d:350]">
      <div className="relative isolate">
        {/* A glow behind the phone takes the colour of each decision. */}
        <div
          aria-hidden
          className={cn(
            "absolute -inset-10 -z-10 rounded-[5rem] blur-3xl transition-[background-color,opacity] duration-700",
            decided ? (admit ? "bg-go opacity-30" : "bg-stop opacity-30") : "bg-accent opacity-[0.12]",
          )}
        />
        {/* The phone stays dark in both themes, like the real scanner. */}
        <div
          data-theme="dark"
          role="img"
          aria-label="A phone running the door scanner, admitting guests one after another."
          className="relative aspect-[9/15.5] overflow-hidden rounded-[2.5rem] border border-[#333] bg-black text-white [box-shadow:0_0_0_6px_#111,0_30px_80px_-20px_rgb(0_0_0/0.6)]"
        >
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-5 pt-5 text-sm">
            <span className="font-semibold">Main entrance</span>
            <span
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors duration-300",
                online && queued === 0 ? "bg-success-soft text-success" : online ? "bg-accent-soft text-accent-text" : "bg-warning-soft text-warning",
              )}
            >
              {online ? <IconWifi aria-hidden className="size-3.5" /> : <IconWifiOff aria-hidden className="size-3.5" />}
              <span key={`${online}-${queued}`} className="count-in">
                {online ? (queued > 0 ? `Syncing ${queued}` : "Online") : queued > 0 ? `Offline, ${queued} saved` : "Offline"}
              </span>
            </span>
          </div>

          {/* Viewfinder */}
          <div className="absolute inset-x-5 top-16 bottom-24 overflow-hidden rounded-3xl bg-[#101010]">
            <Brackets
              className={cn(
                "transition-[inset,opacity] duration-500 ease-out-soft",
                framed ? "inset-[13%] opacity-100" : "opacity-50",
              )}
            />
            <div
              key={turn}
              data-stock={guest.stock}
              className={cn(
                "absolute inset-x-[19%] top-1/2 rounded-2xl bg-accent p-3 shadow-[0_20px_40px_rgb(0_0_0/0.5)]",
                phase === "waiting" && "translate-y-[110%] rotate-[7deg] opacity-0",
                framed && "-translate-y-1/2 transition-[translate,rotate,opacity] duration-700 ease-spring",
                phase === "leaving" && "-translate-y-[230%] -rotate-[5deg] opacity-0 transition-[translate,rotate,opacity] duration-[420ms] ease-in",
              )}
            >
              <div className="rounded-lg bg-white p-2.5">
                <div className="aspect-square [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
              </div>
              <p className="mt-2 truncate text-center text-sm font-semibold text-ink">{guest.name}</p>
            </div>
            {phase === "scanning" && (
              <div className="sweep absolute inset-x-[10%] h-0.5 rounded-full bg-white shadow-[0_0_14px_3px_rgb(255_255_255/.6)]" />
            )}
          </div>

          <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
            <p className="display h-[0.95em] overflow-hidden text-5xl leading-none tabular-nums">
              <span key={inside} className="count-in inline-block">
                {inside}
              </span>
            </p>
            <p className="text-right text-sm leading-tight text-muted">
              of 80 guests
              <br />
              inside
            </p>
          </div>

          {decided && (
            <div
              className={cn(
                "flood absolute inset-0 z-20 grid place-content-center px-6 text-center text-ink transition-opacity duration-300",
                admit ? "bg-go" : "bg-stop",
                phase === "leaving" && "opacity-0",
              )}
            >
              <span className="pop mx-auto mb-3 grid size-16 place-items-center rounded-full bg-ink text-white">
                {admit ? <IconCheck className="size-9" stroke={3} /> : <IconX className="size-9" stroke={3} />}
              </span>
              <p className="rise display text-6xl [--d:90]">{admit ? "Admit" : "Stop"}</p>
              <p className="rise mt-2 text-xl font-semibold [--d:160]">{guest.name}</p>
              <p className="rise mt-1 text-sm font-medium [--d:220]">
                {!admit
                  ? guest.stock === "rose"
                    ? "Already checked in at 7:42 PM"
                    : "Ticket is for another night"
                  : online
                    ? "Checked in"
                    : "Saved on this phone"}
              </p>
            </div>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line-strong px-4 py-3 transition-colors hover:border-fg">
        {online ? (
          <IconWifi aria-hidden className="size-5 shrink-0 text-success" />
        ) : (
          <IconWifiOff aria-hidden className="size-5 shrink-0 text-warning" />
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block font-semibold">Venue Wi-Fi</span>
          <span className="block text-sm text-muted">{online ? "Switch it off. The line keeps moving." : "Still scanning. Switch it back on to sync."}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={online}
          onChange={(e) => setOnline(e.target.checked)}
          className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-warning transition-colors duration-150 checked:bg-go after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-ink after:transition-transform after:duration-200 after:ease-out-soft checked:after:translate-x-5"
        />
      </label>

      {calm && (
        <Button type="button" variant="secondary" disabled={phase !== "waiting"} onClick={() => setPhase("scanning")}>
          <IconPlayerPlay className="size-4" /> Scan next ticket
        </Button>
      )}
    </div>
  );
}

export function Brackets({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-[9%]", className)}>
      <span className="absolute top-0 left-0 size-8 rounded-tl-xl border-t-[3px] border-l-[3px] border-white/80" />
      <span className="absolute top-0 right-0 size-8 rounded-tr-xl border-t-[3px] border-r-[3px] border-white/80" />
      <span className="absolute bottom-0 left-0 size-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/80" />
      <span className="absolute right-0 bottom-0 size-8 rounded-br-xl border-r-[3px] border-b-[3px] border-white/80" />
    </div>
  );
}
