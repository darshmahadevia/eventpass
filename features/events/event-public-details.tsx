import Link from "next/link";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconExternalLink,
  IconMapPin,
} from "@tabler/icons-react";

import { EventPassMark } from "@/components/eventpass-mark";
import { TicketRecoveryForm } from "@/features/tickets/ticket-recovery-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PublicEventDetails = {
  name: string;
  description: string;
  eventTimeZone: string;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  venueAddress: string;
  venueMapUrl: string | null;
  capacity: number;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  suspended: boolean;
  slug: string;
  status?: string;
  cancellationReason?: string | null;
};

/** Where registration stands right now, so the page never offers what it can't give. */
export type RegistrationPhase =
  | "open"
  | "not-open"
  | "closed"
  | "over"
  | "canceled"
  | "unavailable";

function formatRange(startsAt: Date, endsAt: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).formatRange(startsAt, endsAt);
}

function formatMoment(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function RegistrationPanel({
  event,
  phase,
  full,
  children,
}: {
  event: PublicEventDetails;
  phase: RegistrationPhase;
  full: boolean;
  children?: React.ReactNode;
}) {
  const moment = (date: Date) => formatMoment(date, event.eventTimeZone);

  if (phase === "open") {
    return (
      <>
        <h2 className="text-2xl font-headline">
          {full ? "Join the waitlist" : "Get your ticket"}
        </h2>
        {full ? (
          <p className="mt-2 text-support text-muted-foreground">
            This event is full. Register and you join the line. If a place
            opens, we email you.
          </p>
        ) : null}
        <div className="mt-5">{children}</div>
        <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">
          Registration closes {moment(event.registrationClosesAt)}. No account
          needed.
        </p>
      </>
    );
  }

  const content: Record<
    Exclude<RegistrationPhase, "open">,
    { title: string; body: string }
  > = {
    "not-open": {
      title: "Registration opens soon",
      body: `You can get your ticket from ${moment(event.registrationOpensAt)}.`,
    },
    closed: {
      title: "Registration has closed",
      body: "If you registered, your ticket is in your email.",
    },
    over: {
      title: "This event has ended",
      body: "Registration is closed.",
    },
    canceled: {
      title: "Registration closed",
      body: "Registration and check-in are closed, and existing tickets no longer work.",
    },
    unavailable: {
      title: "Currently unavailable",
      body: "Registration and check-in are paused for this event.",
    },
  };
  const { title, body } = content[phase];

  return (
    <div role="status">
      <h2 className="text-2xl font-headline">{title}</h2>
      {phase === "canceled" && event.cancellationReason ? (
        <p className="mt-3 text-support">{event.cancellationReason}</p>
      ) : null}
      <p className="mt-3 text-support text-muted-foreground">{body}</p>
    </div>
  );
}

export function EventPublicDetails({
  event,
  phase,
  registration,
  preview = false,
  full = false,
}: {
  event: PublicEventDetails;
  phase: RegistrationPhase;
  registration?: React.ReactNode;
  preview?: boolean;
  full?: boolean;
}) {
  const canceled = phase === "canceled";
  const surface = canceled
    ? "poster-surface signal-surface bg-poster-refused text-poster-ink"
    : "dark bg-background text-foreground";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className={surface}>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <EventPassMark />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* The poster. Ink, like a printed gig bill, unless the event was
            canceled, when the whole thing takes the door's refusal colour. */}
        <div className={surface}>
          <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-14 lg:pb-16">
            <div className="lg:max-w-[calc(100%-29rem)]">
              {canceled ? (
                <p className="mb-3 text-lg font-headline">
                  This event was canceled
                </p>
              ) : null}
              <h1 className="type-poster wrap-anywhere">{event.name}</h1>
              <p className="mt-5 text-lg font-semibold text-pretty">
                {formatRange(event.startsAt, event.endsAt, event.eventTimeZone)}
              </p>
              <p className="mt-1 text-lg text-pretty">{event.venueName}</p>
              {phase === "open" ? (
                <a
                  href="#registration"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-6 bg-poster-confirmed text-poster-ink hover:bg-poster-confirmed/85 lg:hidden",
                  )}
                >
                  {full ? "Join the waitlist" : "Get your ticket"}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14 lg:py-14">
          <div className="min-w-0">
            <p className="max-w-2xl text-lg leading-relaxed whitespace-pre-wrap sm:text-xl">
              {event.description}
            </p>

            <dl className="mt-10 grid gap-6 border-t pt-8 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-2 font-semibold">
                  <IconCalendarEvent
                    aria-hidden="true"
                    className="size-5 shrink-0"
                  />
                  When
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  {formatRange(
                    event.startsAt,
                    event.endsAt,
                    event.eventTimeZone,
                  )}
                  {!preview &&
                  (phase === "open" ||
                    phase === "not-open" ||
                    phase === "closed") ? (
                    <a
                      href={`/e/${event.slug}/calendar`}
                      className="mt-1 flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 md:min-h-6"
                    >
                      Add to calendar
                      <IconCalendarPlus aria-hidden="true" className="size-4" />
                    </a>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 font-semibold">
                  <IconMapPin aria-hidden="true" className="size-5 shrink-0" />
                  Where
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  <span className="block text-foreground">
                    {event.venueName}
                  </span>
                  {event.venueAddress}
                  {event.venueMapUrl ? (
                    <Link
                      href={event.venueMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 md:min-h-6"
                    >
                      Open map
                      <IconExternalLink aria-hidden="true" className="size-4" />
                    </Link>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>

          {/* Rides up over the poster on a wide screen, so the page reads as
              one object: the bill, and the stub you tear off it. */}
          <aside
            id="registration"
            aria-label="Registration"
            className="panel h-fit scroll-mt-4 p-5 shadow-xl sm:p-7 lg:sticky lg:top-6 lg:-mt-72"
          >
            <RegistrationPanel event={event} phase={phase} full={full}>
              {registration}
            </RegistrationPanel>
            {!preview &&
            (phase === "open" || phase === "closed" || phase === "not-open") ? (
              <div className="mt-4 border-t pt-3">
                <TicketRecoveryForm slug={event.slug} />
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 text-sm text-muted-foreground sm:px-6 sm:py-4">
          <span>Tickets by EventPass</span>
          <Link
            href="/"
            className="flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
          >
            Run your own event
          </Link>
        </div>
      </footer>
    </div>
  );
}
