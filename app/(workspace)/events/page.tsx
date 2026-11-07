import { IconPlus, IconScan } from "@tabler/icons-react";
import { desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ButtonLink, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatEventRange } from "@/lib/time";

export const metadata = { title: "Events" };

const { events, eventStaff, registrations } = schema;

export default async function EventsPage() {
  const user = await requireUser();

  const owned = await db
    .select({
      event: events,
      registered: sql<number>`count(${registrations.id}) filter (where ${registrations.status} = 'registered')`.mapWith(Number),
    })
    .from(events)
    .leftJoin(registrations, eq(registrations.eventId, events.id))
    .where(eq(events.ownerId, user.id))
    .groupBy(events.id)
    .orderBy(desc(events.startsAt));

  const staffed = await db
    .select()
    .from(events)
    .where(
      inArray(events.id, db.select({ id: eventStaff.eventId }).from(eventStaff).where(eq(eventStaff.email, user.email))),
    )
    .orderBy(desc(events.startsAt));

  return (
    <div className="grid gap-10">
      <section>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Your events</h1>
          <ButtonLink href="/events/new">
            <IconPlus className="size-4" /> New event
          </ButtonLink>
        </div>
        {owned.length === 0 ? (
          <Card className="px-6 py-14 text-center">
            <p className="font-semibold">No events yet</p>
            <p className="mt-1 text-sm text-muted">Create your first event to get a registration link.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {owned.map(({ event, registered }) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-accent">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold">{event.title}</h2>
                      <StatusBadge event={event} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatEventRange(event.startsAt, event.endsAt, event.timeZone)}
                    </p>
                  </div>
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-fg">{registered}</span>
                    {event.capacity ? ` / ${event.capacity}` : ""} registered
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {staffed.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">Door team</h2>
          <div className="grid gap-3">
            {staffed.map((event) => (
              <Card key={event.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {formatEventRange(event.startsAt, event.endsAt, event.timeZone)}
                  </p>
                </div>
                <ButtonLink href={`/scan/${event.id}`} variant="secondary">
                  <IconScan className="size-4" /> Open scanner
                </ButtonLink>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
