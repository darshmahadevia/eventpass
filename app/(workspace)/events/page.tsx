import { IconPlus, IconScan } from "@tabler/icons-react";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { EventTicket } from "@/components/event-ticket";
import { ButtonLink, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

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

  const now = new Date();
  // Soonest first for what's coming; most recent first for what's done.
  const upcoming = owned.filter(({ event }) => event.endsAt >= now).reverse();
  const past = owned.filter(({ event }) => event.endsAt < now);

  return (
    <div className="grid grid-cols-1 gap-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle>Your events</PageTitle>
        {owned.length > 0 && (
          <ButtonLink href="/events/new">
            <IconPlus aria-hidden className="size-4" stroke={2.4} /> New event
          </ButtonLink>
        )}
      </div>

      {owned.length === 0 ? (
        <section className="grid place-items-center rounded-3xl border-2 border-dashed border-line-strong px-6 py-16 text-center sm:py-24">
          <h2 className="display text-5xl sm:text-6xl">Nothing on the roll yet</h2>
          <p className="mt-3 max-w-md text-pretty text-muted">
            Create an event to get a registration link. Guests get QR tickets, and your door team gets a scanner.
          </p>
          <ButtonLink href="/events/new" size="lg" className="mt-8">
            <IconPlus aria-hidden className="size-5" stroke={2.4} /> Create your first event
          </ButtonLink>
        </section>
      ) : (
        <>
          {upcoming.length > 0 && (
            <EventList title="Coming up" count={upcoming.length}>
              {upcoming.map(({ event, registered }) => (
                <EventTicket key={event.id} event={event} registered={registered} href={`/events/${event.id}`} />
              ))}
            </EventList>
          )}
          {past.length > 0 && (
            <EventList title="Past" count={past.length}>
              {past.map(({ event, registered }) => (
                <EventTicket key={event.id} event={event} registered={registered} href={`/events/${event.id}`} />
              ))}
            </EventList>
          )}
        </>
      )}

      {staffed.length > 0 && (
        <EventList title="On the door" count={staffed.length} description="Events where you're on the door team.">
          {staffed.map((event) => (
            <EventTicket
              key={event.id}
              event={event}
              action={
                <ButtonLink href={`/scan/${event.id}`} className="w-full sm:w-auto">
                  <IconScan aria-hidden className="size-4" /> Open scanner
                </ButtonLink>
              }
            />
          ))}
        </EventList>
      )}
    </div>
  );
}

function EventList({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-sm text-faint tabular-nums">{count}</span>
        {description && <p className="ml-auto hidden text-sm text-muted sm:block">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3">{children}</div>
    </section>
  );
}
