import { cn } from "@/lib/utils";

/**
 * The stub-and-body shape used for events everywhere: a coloured stub carrying the
 * date, a perforation, then the body. Notches are cut where the two pieces meet.
 */
export function DateStub({
  month,
  day,
  weekday,
  className,
}: {
  month: string;
  day: string;
  weekday: string;
  className?: string;
}) {
  return (
    <div className={cn("notch-r relative grid w-22 shrink-0 place-content-center rounded-l-2xl bg-accent py-3 text-center text-ink", className)}>
      <p className="text-sm leading-none font-semibold">{month}</p>
      <p className="display mt-1 text-4xl leading-none">{day}</p>
      <p className="mt-1 text-sm leading-none font-semibold">{weekday}</p>
      <span aria-hidden className="perf-y absolute inset-y-3 -right-px [--perf:var(--bg)]" />
    </div>
  );
}

/** Rubber-stamped across a ticket. */
export function Stamp({ tone, children }: { tone: "go" | "void"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "stamp display pointer-events-none rounded-lg border-[3px] px-3 py-1.5 text-center text-lg leading-none tracking-[0.04em] uppercase",
        tone === "go" ? "border-[#0a6b3a] text-[#0a6b3a]" : "border-[#b3160f] text-[#b3160f]",
      )}
    >
      {children}
    </div>
  );
}
