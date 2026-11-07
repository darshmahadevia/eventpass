import { IconExternalLink, IconScan } from "@tabler/icons-react";
import Link from "next/link";
import { Tabs } from "@/components/client";
import { StatusBadge } from "@/components/status-badge";
import { ButtonLink } from "@/components/ui";
import { getOwnedEvent } from "@/lib/events";
import { formatEventRange } from "@/lib/time";

export default async function EventLayout({ children, params }: LayoutProps<"/events/[eventId]">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  const base = `/events/${event.id}`;

  return (
    <div>
      <Link href="/events" className="text-sm text-muted hover:text-fg">
        ← Events
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            <StatusBadge event={event} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatEventRange(event.startsAt, event.endsAt, event.timeZone)}
            {event.location && ` · ${event.location}`}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/e/${event.slug}`} variant="secondary" target="_blank">
            <IconExternalLink className="size-4" /> Public page
          </ButtonLink>
          <ButtonLink href={`/scan/${event.id}`}>
            <IconScan className="size-4" /> Scanner
          </ButtonLink>
        </div>
      </div>
      <div className="mt-6 mb-8 border-b border-border">
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
