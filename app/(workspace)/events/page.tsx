import type { Metadata } from "next";
import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconCalendarPlus,
  IconPlus,
  IconScan,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  listStaffEvents,
  type StaffEvent,
} from "@/features/events/server/list-staff-events";
import { staffEventHomePath } from "@/features/staffing/staffing-policy";
import { formatCompactRange } from "@/lib/format-event-range";
import { getActiveStaffSession } from "@/lib/staff-session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Events",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  organizer: "Organizer",
  check_in_volunteer: "Door volunteer",
};

function formatPart(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en", { timeZone, ...options }).format(date);
}

function formatTimes({ startsAt, endsAt, eventTimeZone }: StaffEvent) {
  return formatCompactRange(startsAt, endsAt, eventTimeZone);
}

// Sorted by what the person has to do next, not by date alone: a door that is
// open right now outranks anything on the calendar, and an event that is over
// should not sit above the one coming up.
function groupEvents(events: StaffEvent[], now: Date) {
  const live: StaffEvent[] = [];
  const upcoming: StaffEvent[] = [];
  const drafts: StaffEvent[] = [];
  const finished: StaffEvent[] = [];

  for (const item of events) {
    const isOver = item.endsAt < now;
    if (item.status === "canceled" || (item.status === "published" && isOver)) {
      finished.push(item);
    } else if (item.status === "draft") {
      drafts.push(item);
    } else if (
      !item.suspended &&
      item.checkInOpensAt <= now &&
      now <= item.checkInClosesAt
    ) {
      live.push(item);
    } else {
      upcoming.push(item);
    }
  }

  return { live, upcoming, drafts, finished: finished.reverse() };
}

function LiveEvent({ item }: { item: StaffEvent }) {
  const percent = item.confirmed
    ? Math.min(100, Math.round((item.arrived / item.confirmed) * 100))
    : 0;

  return (
    <article className="poster-surface signal-surface relative overflow-hidden rounded-[var(--radius-overlay)] bg-poster-confirmed p-5 text-poster-ink sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm font-semibold">Doors are open</p>
          <ViewTransition name={`event-${item.id}`}>
            <h2 className="type-answer">{item.name}</h2>
          </ViewTransition>
          <p className="text-sm">
            {formatTimes(item)}
            <br />
            {item.venueName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PendingLink
            href={`/scanner/${item.id}`}
            className={cn(buttonVariants({ size: "lg" }), "max-sm:flex-1")}
            pendingLabel="Opening scanner"
          >
            <IconScan data-icon="inline-start" />
            Open scanner
          </PendingLink>
          {item.role !== "check_in_volunteer" ? (
            <PendingLink
              href={staffEventHomePath(item.role, item.id)}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-poster-ink/50 bg-transparent hover:bg-poster-ink/10 max-sm:flex-1",
              )}
              pendingLabel="Opening event"
            >
              Open event
            </PendingLink>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div
          role="progressbar"
          aria-label="Arrivals"
          aria-valuemin={0}
          aria-valuemax={item.confirmed}
          aria-valuenow={item.arrived}
          className="h-2 flex-1 overflow-hidden rounded-full bg-poster-ink/15"
        >
          <div
            className="h-full rounded-full bg-poster-ink"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {item.arrived} of {item.confirmed} arrived
        </p>
      </div>
    </article>
  );
}

function EventRow({ item, dimmed }: { item: StaffEvent; dimmed?: boolean }) {
  const { eventTimeZone: timeZone, startsAt } = item;
  const filled = item.capacity
    ? Math.min(100, Math.round((item.confirmed / item.capacity) * 100))
    : 0;
  const canceled = item.status === "canceled";

  return (
    <li className="group relative flex items-stretch transition-colors hover:bg-muted/40">
      {/* The stub: when it happens, read first, the way a ticket is. */}
      <div
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center border-r border-dashed py-4 text-center sm:w-24",
          dimmed && "text-muted-foreground",
        )}
      >
        <span className="text-xs font-semibold">
          {formatPart(startsAt, timeZone, { month: "short" })}
        </span>
        <span className="text-2xl leading-none font-extrabold tabular-nums sm:text-3xl">
          {formatPart(startsAt, timeZone, { day: "numeric" })}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 p-4 sm:gap-6 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <ViewTransition name={`event-${item.id}`}>
                <h3 className="min-w-0 text-lg leading-snug font-headline">
                  <PendingLink
                    href={staffEventHomePath(item.role, item.id)}
                    pendingLabel={`Opening ${item.name}`}
                    // Stretched across the row, so the whole row is the target.
                    className="outline-none before:absolute before:inset-0 before:content-[''] focus-visible:before:ring-3 focus-visible:before:ring-ring/40 focus-visible:before:ring-inset"
                  >
                    {item.name}
                  </PendingLink>
                </h3>
              </ViewTransition>
              {canceled ? <Badge variant="destructive">Canceled</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              {formatTimes(item)}
            </p>
            <p className="text-sm text-muted-foreground">{item.venueName}</p>
          </div>

          {canceled ? null : (
            <div className="min-w-0 md:w-48 md:shrink-0">
              <p className="text-sm tabular-nums">
                <span className="font-semibold">{item.confirmed}</span>
                <span className="text-muted-foreground">
                  {" "}
                  of {item.capacity.toLocaleString()} registered
                </span>
              </p>
              <div
                aria-hidden="true"
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-foreground/70"
                  style={{ width: `${filled}%` }}
                />
              </div>
            </div>
          )}
        </div>
        {item.role === "check_in_volunteer" ? (
          <span className="hidden text-sm text-muted-foreground sm:block">
            {ROLE_LABELS[item.role]}
          </span>
        ) : null}
        <IconArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </li>
  );
}

function EventGroup({
  title,
  events,
  dimmed,
}: {
  title: string;
  events: StaffEvent[];
  dimmed?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <ul className="panel divide-y overflow-hidden">
        {events.map((item) => (
          <EventRow key={item.id} item={item} dimmed={dimmed} />
        ))}
      </ul>
    </section>
  );
}

function currentTime() {
  return new Date();
}

export default async function EventsPage() {
  const staffSession = await getActiveStaffSession();

  if (!staffSession) {
    redirect("/sign-in");
  }

  const events = await listStaffEvents(staffSession.user.id);
  const { live, upcoming, drafts, finished } = groupEvents(events, currentTime());

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="type-page">Events</h1>
        <PendingLink
          href="/events/new"
          className={buttonVariants()}
          pendingLabel="Opening form"
        >
          <IconPlus data-icon="inline-start" />
          Create event
        </PendingLink>
      </div>

      {events.length === 0 ? (
        <Empty className="panel min-h-96">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconCalendarPlus aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Your first event starts here</EmptyTitle>
            <EmptyDescription>
              Start with a draft. Nothing is visible to guests until you
              publish it. If someone invited you to work a door, open the link
              in your invitation email.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <PendingLink
              href="/events/new"
              className={buttonVariants({ size: "lg" })}
              pendingLabel="Opening form"
            >
              <IconPlus data-icon="inline-start" />
              Create your first event
            </PendingLink>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {live.map((item) => (
            <LiveEvent key={item.id} item={item} />
          ))}
          <EventGroup title="Coming up" events={upcoming} />
          <EventGroup title="Drafts" events={drafts} />
          <EventGroup title="Past and canceled" events={finished} dimmed />
        </>
      )}
    </main>
  );
}
