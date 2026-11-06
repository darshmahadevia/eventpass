import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import {
  IconCalendarEvent,
  IconClockQuestion,
  IconMapPin,
  IconSend,
  IconUsers,
  IconArrowRight,
} from "@tabler/icons-react";

import { FormSubmitButton } from "@/components/form-submit-button";
import { getOrganizerEvent } from "@/features/events/server/get-event";
import { getOrganizerEventMetrics } from "@/features/events/server/get-event-metrics";
import { LiveMetricsDashboard } from "@/features/events/live-metrics-dashboard";
import { LiveMetricsSkeleton } from "@/features/events/live-metrics-skeleton";
import { getActiveStaffSession } from "@/lib/staff-session";
import { DeleteEventControl } from "@/features/events/delete-event-control";
import { CancelEventControl } from "@/features/events/cancel-event-control";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PendingLink } from "@/components/pending-link";

import {
  deleteEventAction,
  cancelEventAction,
  publishEventAction,
  returnEventToDraftAction,
} from "../actions";

export const metadata: Metadata = { title: "Event Overview" };

function formatRange(startsAt: Date, endsAt: Date, timeZone: string) {
  // `dateStyle`/`timeStyle` cannot be combined with `timeZoneName` — ECMA-402
  // rejects the mix and `Intl.DateTimeFormat` throws "Invalid option : option".
  // The Event Time Zone has to stay visible, so spell the components out.
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).formatRange(startsAt, endsAt);
}

async function EventMetrics({
  eventId,
  eventSlug,
  staffUserId,
}: {
  eventId: string;
  eventSlug: string;
  staffUserId: string;
}) {
  const initialMetrics = await getOrganizerEventMetrics(eventId, staffUserId);
  if (!initialMetrics) notFound();

  return (
    <LiveMetricsDashboard
      eventId={eventId}
      eventSlug={eventSlug}
      initialMetrics={initialMetrics}
    />
  );
}

export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const staffSession = await getActiveStaffSession();
  if (!staffSession) redirect("/sign-in");

  const event = await getOrganizerEvent(eventId, staffSession.user.id);

  if (!event) notFound();

  const isDraft = event.status === "draft";
  const isPublished = event.status === "published";
  const isCanceled = event.status === "canceled";
  const isOwner = event.role === "owner";

  return (
    <>
      <h1 className="type-page">Overview</h1>

      {query.error === "unavailable" ? (
        <Alert variant="warning">
          <IconClockQuestion aria-hidden="true" />
          <AlertTitle>Event currently unavailable</AlertTitle>
          <AlertDescription>
            This Event is currently unavailable. Event changes are temporarily
            paused; operational history remains available.
          </AlertDescription>
        </Alert>
      ) : query.error ? (
        <Alert variant="warning">
          <IconClockQuestion aria-hidden="true" />
          <AlertTitle>Event not deleted</AlertTitle>
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      {isCanceled ? (
        <Alert variant="destructive">
          <IconClockQuestion aria-hidden="true" />
          <AlertTitle>This event was canceled</AlertTitle>
          <AlertDescription>
            {event.cancellationReason} All active tickets are invalid, and
            Registration and admission are closed. Operational history remains
            available.
          </AlertDescription>
        </Alert>
      ) : null}

      {isDraft ? (
        <section aria-labelledby="setup-heading" className="panel overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 id="setup-heading" className="text-xl font-headline">
                Ready when you are
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground text-pretty">
                This draft is private. Check the steps below, then publish.
                Anyone with the link can see it after that, and the web address
                is fixed. It is never listed in a public directory.
              </p>
            </div>
            <form action={publishEventAction.bind(null, event.id)} className="shrink-0">
              <FormSubmitButton
                pendingLabel="Publishing event"
                size="lg"
                className="w-full sm:w-auto"
              >
                <IconSend data-icon="inline-start" />
                Publish event
              </FormSubmitButton>
            </form>
          </div>
          <ul className="divide-y border-t">
            {[
              {
                title: "Review event details",
                description:
                  "Check the schedule, venue, capacity, and registration times.",
                path: "edit",
              },
              {
                title: "Customize registration",
                description:
                  "Name and email are included. Add any other questions you need.",
                path: "form",
              },
              {
                title: "Invite your door team",
                description:
                  "Optional for now. Add organizers and volunteers before doors open.",
                path: "staff",
              },
            ].map((item) => (
              <li key={item.path}>
                <PendingLink
                  href={`/events/${event.id}/${item.path}`}
                  aria-label={item.title}
                  pendingLabel="Opening"
                  className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/50 sm:px-6"
                >
                  <div className="flex flex-col">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <IconArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </PendingLink>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Suspense fallback={<LiveMetricsSkeleton />}>
          <EventMetrics
            eventId={event.id}
            eventSlug={event.slug}
            staffUserId={staffSession.user.id}
          />
        </Suspense>
      )}

      <section className="panel" aria-labelledby="configuration-heading">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <h2 id="configuration-heading" className="text-lg font-headline">
            Event details
          </h2>
          <PendingLink
            href={`/events/${event.id}/edit`}
            pendingLabel="Opening settings"
            className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Edit
          </PendingLink>
        </div>
        <dl className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
          <div>
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <IconCalendarEvent aria-hidden="true" className="size-4" />
              Schedule
            </dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              {formatRange(event.startsAt, event.endsAt, event.eventTimeZone)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <IconMapPin aria-hidden="true" className="size-4" />
              Venue
            </dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              {event.venueName}
              <br />
              {event.venueAddress}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <IconUsers aria-hidden="true" className="size-4" />
              Capacity
            </dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              {event.capacity.toLocaleString()} places
            </dd>
          </div>
        </dl>
      </section>

      {isPublished || (isDraft && isOwner) ? (
        <section aria-labelledby="manage-heading" className="flex flex-col gap-3">
          <h2 id="manage-heading" className="text-sm font-semibold text-muted-foreground">
            Manage this event
          </h2>
          <div className="panel divide-y">
            {isPublished ? (
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="font-semibold">Return to draft</h3>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Hides the public page and keeps the web address reserved.
                    Not available once anyone has registered.
                  </p>
                </div>
                <form action={returnEventToDraftAction.bind(null, event.id)}>
                  <FormSubmitButton
                    pendingLabel="Returning to draft"
                    variant="outline"
                  >
                    Return to draft
                  </FormSubmitButton>
                </form>
              </div>
            ) : null}

            {isPublished && isOwner ? (
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="font-semibold">Cancel this event</h3>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Takes effect at once and cannot be undone. All records are
                    kept. Only the owner can do this.
                  </p>
                </div>
                <CancelEventControl
                  action={cancelEventAction.bind(null, event.id)}
                  eventName={event.name}
                />
              </div>
            ) : null}

            {isDraft && isOwner ? (
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="font-semibold">Delete draft</h3>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Permanently removes this empty draft. Only the owner can do
                    this.
                  </p>
                </div>
                <DeleteEventControl
                  action={deleteEventAction.bind(null, event.id)}
                  eventName={event.name}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
