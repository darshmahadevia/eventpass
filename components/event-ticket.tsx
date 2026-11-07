import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { DateStub } from "@/components/ticket";
import { Meter } from "@/components/ui";
import type { Event } from "@/lib/db/schema";
import { stockFor } from "@/lib/stock";
import { dateParts, formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";

/** An event as a ticket: the dated stub on the left, the body on the right. */
export function EventTicket({
  event,
  href,
  registered,
  action,
}: {
  event: Event;
  href?: string;
  registered?: number;
  action?: React.ReactNode;
}) {
  const date = dateParts(event.startsAt, event.timeZone);
  const muted = event.status === "cancelled" || event.endsAt < new Date();

  const body = (
    <>
      <DateStub {...date} className={cn(muted && "grayscale-[0.85] brightness-90")} />
      <div className="notch-l flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-r-2xl bg-surface py-4 pr-5 pl-6 transition-colors duration-150 group-hover:bg-raised sm:pr-6">
        <div className="min-w-0 flex-1 basis-60">
          <StatusBadge event={event} />
          <h3 className="display mt-2 truncate text-xl leading-tight sm:text-2xl">{event.title}</h3>
          <p className="mt-1.5 truncate text-sm text-muted">
            {formatTimeRange(event.startsAt, event.endsAt, event.timeZone)}
            {event.location && ` · ${event.location}`}
          </p>
        </div>
        {registered !== undefined && (
          <div className="w-full sm:w-40">
            <p className="flex items-baseline justify-between gap-2 text-sm text-muted">
              <span>Registered</span>
              <span>
                <span className="font-semibold text-fg tabular-nums">{registered}</span>
                {event.capacity ? ` / ${event.capacity}` : ""}
              </span>
            </p>
            {event.capacity ? (
              <Meter value={registered} max={event.capacity} label="Registered of capacity" className="mt-2" />
            ) : (
              <p className="mt-1 text-xs text-faint">No capacity limit</p>
            )}
          </div>
        )}
        {action}
      </div>
    </>
  );

  return href ? (
    <Link href={href} data-stock={stockFor(event.id)} className="group flex min-w-0 rounded-2xl">
      {body}
    </Link>
  ) : (
    <div data-stock={stockFor(event.id)} className="group flex min-w-0 rounded-2xl">
      {body}
    </div>
  );
}
