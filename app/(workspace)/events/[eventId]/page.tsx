import { IconArrowRight } from "@tabler/icons-react";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { AutoRefresh, CopyButton } from "@/components/client";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, Badge, Card, Meter, Notice } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { closedReason, getEventStats, getOwnedEvent } from "@/lib/events";
import { formatTime } from "@/lib/time";
import { appUrl } from "@/lib/utils";
import { setStatusAction } from "../actions";

const { registrations } = schema;

const LINK_COPY = {
  open: "Registration is open. Share this link anywhere.",
  full: "The event is full, so the page shows registration as closed.",
  ended: "The event has ended.",
  draft: "The link starts working when you publish.",
  cancelled: "Registration is closed.",
} as const;

export default async function EventOverviewPage({ params }: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  const stats = await getEventStats(event.id);
  const recent = await db.query.registrations.findMany({
    where: and(eq(registrations.eventId, event.id), isNotNull(registrations.checkedInAt)),
    orderBy: desc(registrations.checkedInAt),
    limit: 8,
  });

  const expected = stats.registered - stats.checkedIn;
  const arrivedPct = stats.registered ? Math.round((stats.checkedIn / stats.registered) * 100) : 0;
  const publicUrl = appUrl(`/e/${event.slug}`);
  const reason = closedReason(event, stats.registered);
  const live = event.status === "published" && event.endsAt > new Date();
  const doorsOpen = live && event.startsAt <= new Date();
  const guests = `/events/${event.id}/guests`;

  return (
    <div className="grid gap-6">
      {live && <AutoRefresh />}

      {event.status === "draft" && (
        <div className="paper-shadow">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-accent p-6 text-ink sm:p-8">
            <div>
              <h2 className="display text-3xl sm:text-4xl">Ready when you are</h2>
              <p className="mt-1.5 max-w-md font-medium text-pretty">
                This event is a draft. Guests can&apos;t register until you publish it.
              </p>
            </div>
            <form action={setStatusAction.bind(null, event.id, "published")}>
              <SubmitButton size="lg" pendingText="Publishing…" className="bg-ink text-white hover:bg-[#222] hover:brightness-100">
                Publish event
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
      {event.status === "cancelled" && (
        <Notice tone="danger">This event is cancelled. Tickets no longer admit anyone.</Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="flex flex-col justify-between gap-8 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-semibold">Checked in</h2>
            {doorsOpen && (
              <Badge tone="success" live>
                Live
              </Badge>
            )}
          </div>
          <div>
            <p className="flex flex-wrap items-baseline gap-x-4">
              <span className="display text-[clamp(4rem,10vw,6rem)] leading-none tabular-nums">{stats.checkedIn}</span>
              <span className="text-lg text-muted">
                of <span className="font-semibold text-fg tabular-nums">{stats.registered}</span> registered
              </span>
            </p>
            <Meter value={stats.checkedIn} max={stats.registered} tone="go" label="Guests checked in" className="mt-6 h-2.5" />
            <p className="mt-2.5 text-sm text-muted tabular-nums">{arrivedPct}% arrived</p>
          </div>
        </Card>

        <Card className="grid overflow-hidden">
          <div className="grid divide-y divide-line">
            <Stat
              label="Registered"
              value={stats.registered}
              detail={event.capacity ? `of ${event.capacity} spots` : "No limit"}
              meter={event.capacity ? <Meter value={stats.registered} max={event.capacity} label="Spots taken" className="mt-2.5" /> : null}
            />
            <Stat label="Still expected" value={expected} href={`${guests}?filter=expected`} />
            <Stat label="Cancelled" value={stats.cancelled} href={`${guests}?filter=cancelled`} />
          </div>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold">Registration link</h2>
          <p className="mt-1 text-sm text-muted">{LINK_COPY[reason ?? "open"]}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <code className="flex h-11 min-w-0 flex-1 basis-56 items-center overflow-hidden rounded-xl bg-raised px-3.5 font-mono text-sm whitespace-nowrap">
              <span className="truncate">{publicUrl.replace(/^https?:\/\//, "")}</span>
            </code>
            <CopyButton value={publicUrl} />
          </div>
          {event.status === "published" && (
            <form action={setStatusAction.bind(null, event.id, "draft")} className="mt-4 -ml-2">
              <SubmitButton
                variant="ghost"
                size="sm"
                className="px-2 text-muted hover:text-fg"
                confirmTitle="Unpublish?"
                confirm="The registration page stops accepting guests. Tickets already issued keep working."
                confirmLabel="Unpublish"
              >
                Unpublish
              </SubmitButton>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold">Latest arrivals</h2>
            {recent.length > 0 && (
              <Link
                href={`${guests}?filter=arrived`}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-fg"
              >
                All arrivals <IconArrowRight aria-hidden className="size-3.5" />
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="mt-1 text-sm text-muted">
              No one yet. Arrivals show up here as the door scans them{live ? ", live." : "."}
            </p>
          ) : (
            <ul className="mt-3 grid">
              {recent.map((guest) => (
                <li key={guest.id} className="flex items-center gap-3 py-2">
                  <Avatar name={guest.name} tone="success" />
                  <span className="min-w-0 flex-1 truncate font-medium">{guest.name}</span>
                  <span className="text-sm text-muted tabular-nums">
                    {guest.checkedInAt && formatTime(guest.checkedInAt, event.timeZone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  meter,
  href,
}: {
  label: string;
  value: number;
  detail?: string;
  meter?: React.ReactNode;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted">{label}</p>
        <p className="flex items-baseline gap-2">
          {detail && <span className="text-sm text-faint">{detail}</span>}
          <span className="display text-3xl leading-none tabular-nums">{value}</span>
        </p>
      </div>
      {meter}
    </>
  );
  return href ? (
    <Link href={href} className="block px-6 py-5 transition-colors hover:bg-raised">
      {content}
    </Link>
  ) : (
    <div className="px-6 py-5">{content}</div>
  );
}
