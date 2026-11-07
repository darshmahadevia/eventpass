import { IconArrowUpRight, IconScan } from "@tabler/icons-react";
import { Tabs } from "@/components/client";
import { StatusBadge } from "@/components/status-badge";
import { BackLink, ButtonLink } from "@/components/ui";
import { getOwnedEvent } from "@/lib/events";
import { stockFor } from "@/lib/stock";
import { formatEventRange } from "@/lib/time";

export default async function EventLayout({ children, params }: LayoutProps<"/events/[eventId]">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  const base = `/events/${event.id}`;

  return (
    <div data-stock={stockFor(event.id)}>
      <BackLink href="/events">Events</BackLink>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 flex-1 basis-80">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-3 w-5 rounded-[3px] bg-accent" title="Ticket colour" />
            <StatusBadge event={event} />
          </div>
          <h1 className="display mt-3 text-4xl text-balance break-words sm:text-5xl">{event.title}</h1>
          <p className="mt-2 text-muted">
            {formatEventRange(event.startsAt, event.endsAt, event.timeZone)}
            {event.location && <span className="text-faint"> · </span>}
            {event.location}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <ButtonLink href={`/e/${event.slug}`} variant="secondary" target="_blank" className="flex-1 sm:flex-none">
            Public page <IconArrowUpRight aria-hidden className="size-4" />
          </ButtonLink>
          <ButtonLink href={`/scan/${event.id}`} className="flex-1 sm:flex-none">
            <IconScan aria-hidden className="size-4" /> Scanner
          </ButtonLink>
        </div>
      </div>
      <div className="mt-8 mb-10 border-b border-line">
        <Tabs
          tabs={[
            { href: base, label: "Overview" },
            { href: `${base}/guests`, label: "Guests" },
            { href: `${base}/form`, label: "Registration form" },
            { href: `${base}/settings`, label: "Settings" },
          ]}
        />
      </div>
      {children}
    </div>
  );
}
