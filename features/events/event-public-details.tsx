import Link from "next/link";
import {
  IconCalendarEvent,
  IconExternalLink,
  IconMapPin,
} from "@tabler/icons-react";

import { EventPassMark } from "@/components/eventpass-mark";
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
  status?: string;
};

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

export function EventPublicDetails({
  event,
  registration,
}: {
  event: PublicEventDetails;
  registration?: React.ReactNode;
}) {
  const canceled = event.status === "canceled";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* The poster. Ink, like a printed gig bill, unless the event was canceled,
          when the whole thing takes the door's refusal colour. */}
      <div
        className={cn(
          canceled
            ? "poster-surface signal-surface bg-poster-refused text-poster-ink"
            : "dark bg-background text-foreground",
        )}
      >
        <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <EventPassMark />
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-10 sm:px-6 sm:pt-14 lg:pb-16">
          <div className="lg:max-w-[calc(100%-29rem)]">
            {canceled ? (
              <p className="mb-3 text-lg font-headline">This event was canceled</p>
            ) : null}
            <h1 className="type-poster wrap-anywhere">{event.name}</h1>
            <p className="mt-5 text-lg font-semibold text-pretty">
              {formatRange(event.startsAt, event.endsAt, event.eventTimeZone)}
            </p>
            <p className="mt-1 text-lg text-pretty">{event.venueName}</p>
            {canceled || event.suspended ? null : (
              <a
                href="#registration"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-6 bg-poster-confirmed text-poster-ink hover:bg-poster-confirmed/85 lg:hidden",
                )}
              >
                Get your ticket
              </a>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14 lg:py-14">
        <div className="min-w-0">
          <p className="max-w-2xl text-xl leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>

          <dl className="mt-10 grid gap-6 border-t pt-8 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-2 font-semibold">
                <IconCalendarEvent aria-hidden="true" className="size-5 shrink-0" />
                When
              </dt>
              <dd className="mt-1 text-muted-foreground">
                {formatRange(event.startsAt, event.endsAt, event.eventTimeZone)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 font-semibold">
                <IconMapPin aria-hidden="true" className="size-5 shrink-0" />
                Where
              </dt>
              <dd className="mt-1 text-muted-foreground">
                <span className="block text-foreground">{event.venueName}</span>
                {event.venueAddress}
                {event.venueMapUrl ? (
                  <Link
                    href={event.venueMapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4"
                  >
                    Open map
                    <IconExternalLink aria-hidden="true" className="size-4" />
                  </Link>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>

        {/* Rides up over the poster on a wide screen, so the page reads as one
            object: the bill, and the stub you tear off it. */}
        <aside
          id="registration"
          className="panel h-fit scroll-mt-4 p-5 shadow-xl sm:p-7 lg:sticky lg:top-6 lg:-mt-72"
        >
          {event.suspended ? (
            <>
              <h2 className="text-2xl font-headline">Currently unavailable</h2>
              <p className="mt-3 text-support text-muted-foreground">
                Registration and check-in are paused for this event.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-headline">
                {canceled ? "Registration closed" : "Get your ticket"}
              </h2>
              {registration ? <div className="mt-5">{registration}</div> : null}
              {canceled ? null : (
                <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">
                  Registration closes{" "}
                  {formatMoment(event.registrationClosesAt, event.eventTimeZone)}.
                  No account needed.
                </p>
              )}
            </>
          )}
        </aside>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>Tickets by EventPass</span>
          <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
            Run your own event
          </Link>
        </div>
      </footer>
    </div>
  );
}
