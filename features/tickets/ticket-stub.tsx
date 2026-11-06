import Image from "next/image";
import type { ReactNode } from "react";
import {
  IconCalendarEvent,
  IconMapPin,
  IconTicketOff,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// The Ticket is the one object this product asks someone to keep, and it is
// opened on a phone at a door in almost every real case. So the QR leads on
// every viewport — it previously sat below the event details and the full
// management form, meaning an attendee had to scroll past a cancellation
// control to reach the thing they came to show.
//
// Kept as a component so the landing page can render a real ticket rather than
// a screenshot.

function TicketPerforation() {
  return (
    <div
      aria-hidden="true"
      className="relative h-6 w-full shrink-0 @min-[42rem]:h-auto @min-[42rem]:w-6 @min-[42rem]:self-stretch"
    >
      {/* Notches sit half outside the card so the tear line reads as a physical
          cut. They carry the colour behind the ticket, which the host sets as
          `--ticket-surround`. */}
      <span
        className={cn(
          "absolute left-0 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--ticket-surround) @min-[42rem]:left-1/2 @min-[42rem]:top-0 print:hidden",
        )}
      />
      <span
        className={cn(
          "absolute left-full top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--ticket-surround) @min-[42rem]:left-1/2 @min-[42rem]:top-full print:hidden",
        )}
      />
      {/* Two elements rather than `perforation-x @min-[42rem]:perforation-y`: both
          utilities would apply at sm, and which background-repeat won would
          depend on Tailwind's emit order rather than on the class list. */}
      <div className="perforation-x absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 @min-[42rem]:hidden" />
      <div className="perforation-y absolute inset-y-4 left-1/2 hidden w-0.5 -translate-x-1/2 @min-[42rem]:block" />
    </div>
  );
}

export function TicketStub({
  eventName,
  attendeeName,
  scheduleLabel,
  venueName,
  status,
  qrDataUrl,
  formattedCode,
  ticketCodeLabel,
  action,
  className,
  titleAs: Title = "h1",
}: {
  eventName: string;
  attendeeName: string;
  scheduleLabel: string;
  venueName: string;
  status: { label: string; variant: "success" | "warning" | "destructive" };
  /** Omit to render the inactive state, where no admissible ticket exists. */
  qrDataUrl?: string | null;
  formattedCode?: string | null;
  /** Unformatted code, announced instead of the grouped display form. */
  ticketCodeLabel?: string | null;
  action?: ReactNode;
  className?: string;
  /**
   * The ticket owns the page it normally appears on, so the event name is an
   * `h1` by default. Where the ticket is embedded inside another page's
   * outline — the landing showcase — the host passes a lower level so the
   * document does not end up with two `h1`s.
   */
  titleAs?: "h1" | "h2" | "h3";
}) {
  return (
    <article
      className={cn(
        // Paper in both themes. A ticket is a physical thing, and a QR code
        // scans best dark on light.
        "signal-surface @container overflow-hidden rounded-[var(--radius-overlay)] bg-poster-paper text-poster-ink shadow-lg ring-1 ring-poster-ink/10 print:rounded-none print:border-2 print:shadow-none",
        className,
      )}
    >
      {/* Reversed on mobile so the stub renders first on a phone while the DOM
          keeps the event name ahead of the QR for screen readers. */}
      <div className="flex flex-col-reverse @min-[42rem]:flex-row">
        {/* Centred against the stub rather than stretched to its height. The
            details are shorter than the QR chamber, and pinning the schedule to
            the bottom with `mt-auto` opened a dead band across the middle of
            the ticket wherever the event name ran to one line. */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-5 p-6 @min-[42rem]:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {action ? (
              <div className="ml-auto print:hidden">{action}</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Title className="text-4xl leading-tight font-extrabold tracking-tight text-balance wrap-anywhere @min-[42rem]:text-5xl">
              {eventName}
            </Title>
            <p className="text-base text-muted-foreground">
              Ticket for{" "}
              <span className="font-medium text-foreground wrap-anywhere">
                {attendeeName}
              </span>
            </p>
          </div>

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-start gap-2">
              <dt className="shrink-0">
                <IconCalendarEvent
                  aria-hidden="true"
                  className="size-4 translate-y-0.5"
                />
                <span className="sr-only">Schedule</span>
              </dt>
              <dd className="text-muted-foreground">{scheduleLabel}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="shrink-0">
                <IconMapPin
                  aria-hidden="true"
                  className="size-4 translate-y-0.5"
                />
                <span className="sr-only">Venue</span>
              </dt>
              <dd className="text-muted-foreground">{venueName}</dd>
            </div>
          </dl>
        </div>

        <TicketPerforation />

        <div className="flex shrink-0 flex-col items-center gap-4 p-6 text-center @min-[42rem]:w-72 @min-[42rem]:p-8">
          {qrDataUrl && formattedCode ? (
            <>
              {/* Fixed white chamber in both themes. A theme-inverted QR does
                  not scan. */}
              <div className="rounded-md bg-white p-3">
                <Image
                  src={qrDataUrl}
                  alt={`QR code of ticket ${formattedCode}`}
                  width={320}
                  height={320}
                  unoptimized
                  priority
                  className="size-40 @min-[42rem]:size-48"
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">Ticket code</p>
                <p
                  className="font-mono text-2xl font-medium tracking-code"
                  aria-label={ticketCodeLabel ?? formattedCode}
                >
                  {formattedCode}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Single entry, this event only
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <IconTicketOff
                aria-hidden="true"
                className="size-10 text-muted-foreground"
              />
              <p className="text-sm font-medium">No active ticket</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                This ticket was replaced. Only the current one will be admitted
                at the door.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
