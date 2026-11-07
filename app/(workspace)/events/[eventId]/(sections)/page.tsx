import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import {
  IconCalendarEvent,
  IconCircleCheck,
  IconCircleDashed,
  IconClockQuestion,
  IconEye,
  IconMapPin,
  IconSend,
  IconUsers,
  IconArrowRight,
} from "@tabler/icons-react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  eventHasRegistrations,
  getDraftProgress,
  getOrganizerEvent,
} from "@/features/events/server/get-event";
import { getOrganizerEventMetrics } from "@/features/events/server/get-event-metrics";
import { LiveMetricsDashboard } from "@/features/events/live-metrics-dashboard";
import { LiveMetricsSkeleton } from "@/features/events/live-metrics-skeleton";
import { getActiveStaffSession } from "@/lib/staff-session";
import { DeleteEventControl } from "@/features/events/delete-event-control";
import { CancelEventControl } from "@/features/events/cancel-event-control";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
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
  state,
}: {
  eventId: string;
  eventSlug: string;
  staffUserId: string;
  state: "live" | "ended" | "canceled";
}) {
  const initialMetrics = await getOrganizerEventMetrics(eventId, staffUserId);
  if (!initialMetrics) notFound();

  return (
    <LiveMetricsDashboard
      eventId={eventId}
      eventSlug={eventSlug}
      initialMetrics={initialMetrics}
      state={state}
    />
  );
}

export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
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
  // Only offered when it can work. The button used to show on every published
  // event and threw on any event with a single registration.
  const ended = isPublished && event.endsAt < new Date();
  const canCancel = isPublished && isOwner && !ended;
  const canReturnToDraft = isPublished && !(await eventHasRegistrations(event.id));
  const draftProgress = isDraft ? await getDraftProgress(event.id) : null;

  return (
    <>
      <h1 className="type-page">Overview</h1>

      {query.notice === "published" ? (
        <Alert variant="success">
          <IconCircleCheck aria-hidden="true" />
          <AlertTitle>Your event is live</AlertTitle>
          <AlertDescription>
            Anyone with the link can register now. Share it with your guests.
            <CopyLinkButton
              path={`/e/${event.slug}`}
              label="Copy registration link"
              className="mt-3 flex w-fit"
            />
          </AlertDescription>
        </Alert>
      ) : query.notice === "saved" ? (
        <Alert variant="success">
          <IconCircleCheck aria-hidden="true" />
          <AlertTitle>Changes saved</AlertTitle>
        </Alert>
      ) : null}

      {query.error === "unavailable" ? (
        <Alert variant="warning">
          <IconClockQuestion aria-hidden="true" />
          <AlertTitle>Event currently unavailable</AlertTitle>
          <AlertDescription>
            Changes to this event are paused. Everything recorded so far is
            still here.
          </AlertDescription>
        </Alert>
      ) : query.error ? (
        <Alert variant="warning">
          <IconClockQuestion aria-hidden="true" />
          <AlertTitle>That did not work</AlertTitle>
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      {isCanceled ? (
        <Alert variant="destructive">
          <IconClockQuestion aria-hidden="true" />
          <AlertTitle>This event was canceled</AlertTitle>
          <AlertDescription>
            <p>{event.cancellationReason}</p>
            <p>
              Tickets no longer work, and registration and check-in are closed.
              Everything recorded so far is still here.
            </p>
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
              <p className="max-w-xl text-support text-muted-foreground text-pretty">
                This draft is private. Check the steps below, then publish.
                Anyone with the link can register after that. Your event is
                never listed publicly.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <PendingLink
                href={`/events/${event.id}/preview`}
                pendingLabel="Opening preview"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <IconEye data-icon="inline-start" />
                Preview
              </PendingLink>
              <form action={publishEventAction.bind(null, event.id)}>
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
          </div>
          <ul className="divide-y border-t">
            {[
              {
                title: "Review event details",
                description:
                  "Check the schedule, venue, capacity, and registration times.",
                path: "edit",
                done: true,
              },
              {
                title: "Customize registration",
                description: draftProgress?.questions
                  ? `${draftProgress.questions} ${draftProgress.questions === 1 ? "question" : "questions"} added, plus name and email.`
                  : "Name and email are included. Add any other questions you need.",
                path: "form",
                done: Boolean(draftProgress?.questions),
              },
              {
                title: "Invite your door team",
                description: draftProgress?.teammates
                  ? `${draftProgress.teammates} invited or added so far.`
                  : "Optional for now. Add organizers and volunteers before doors open.",
                path: "staff",
                done: Boolean(draftProgress?.teammates),
              },
            ].map((item) => (
              <li key={item.path}>
                <PendingLink
                  href={`/events/${event.id}/${item.path}`}
                  pendingLabel="Opening"
                  className="flex min-h-16 items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 sm:px-6"
                >
                  {item.done ? (
                    <IconCircleCheck
                      aria-label="Done"
                      className="size-5 shrink-0 text-success-text"
                    />
                  ) : (
                    <IconCircleDashed
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
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
            state={
              isCanceled
                ? "canceled"
                : ended
                  ? "ended"
                  : "live"
            }
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
            className="flex min-h-11 items-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-6"
          >
            Settings
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
              {event.capacity.toLocaleString()}{" "}
              {event.capacity === 1 ? "place" : "places"}
            </dd>
          </div>
        </dl>
      </section>

      {canReturnToDraft || canCancel || (isDraft && isOwner) ? (
        <section aria-labelledby="manage-heading" className="flex flex-col gap-3">
          <h2 id="manage-heading" className="text-sm font-semibold text-muted-foreground">
            Manage this event
          </h2>
          <div className="panel divide-y">
            {canReturnToDraft ? (
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="font-semibold">Return to draft</h3>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Hides the public page and keeps the web address reserved.
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

            {canCancel ? (
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="font-semibold">Cancel this event</h3>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Takes effect at once and cannot be undone. Guests are
                    told, tickets stop working, and all records are kept.
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
                    Permanently removes this draft.
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
