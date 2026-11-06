import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconMailExclamation,
  IconMapPin,
  IconShieldCheck,
  IconTicketOff,
} from "@tabler/icons-react";
import QRCode from "qrcode";

import { EventPassMark } from "@/components/eventpass-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import { formatTicketCode } from "@/features/tickets/ticket-code";
import { formatEventRange } from "@/lib/format-event-range";
import { PrintTicketButton } from "@/features/tickets/print-ticket-button";
import { RegistrationManagementControls } from "@/features/tickets/registration-management-controls";
import { TicketStub } from "@/features/tickets/ticket-stub";
import { getManagementView } from "@/features/tickets/server/tickets";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your ticket",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

function formatCompactRange(startsAt: Date, endsAt: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).formatRange(startsAt, endsAt);
}

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const management = await getManagementView(token);
  if (!management) notFound();

  const activeTicket = management.ticket?.status === "active" ? management.ticket : null;
  const qrDataUrl = activeTicket
    ? await QRCode.toDataURL(activeTicket.signedPayload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 480,
      })
    : null;
  const formattedCode = activeTicket ? formatTicketCode(activeTicket.code) : null;
  const deliveryFailed = query.delivery === "failed";

  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground [--ticket-surround:var(--background)] print:bg-background">
      <header className="print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-4 sm:px-6">
          <EventPassMark />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-2 pb-10 sm:px-6 print:max-w-none print:p-0">
        {/* A check-marked shield is the icon this page uses for "your link is
            safe" three alerts down. It was also carrying "this event is
            unavailable" and "your email bounced" — one glyph reading as
            reassurance on two warnings. Same icon as the identical alert on
            the scanner. */}
        {management.event.suspended ? (
          <Alert variant="warning" className="print:hidden">
            <IconAlertTriangle aria-hidden="true" />
            <AlertTitle>Event currently unavailable</AlertTitle>
            <AlertDescription>
              This Event is currently unavailable. Ticket and Registration
              information remains visible, but management actions are paused.
            </AlertDescription>
          </Alert>
        ) : null}

        {management.event.status === "canceled" ? (
          <Alert variant="destructive">
            <IconTicketOff aria-hidden="true" />
            <AlertTitle>This event was canceled</AlertTitle>
            <AlertDescription>
              {management.event.cancellationReason} This ticket is inactive and
              cannot be used for admission. Your registration is kept on record.
            </AlertDescription>
          </Alert>
        ) : null}

        {deliveryFailed ? (
          <Alert variant="warning" className="print:hidden">
            <IconMailExclamation aria-hidden="true" />
            <AlertTitle>
              Your ticket is ready, but the email was not accepted
            </AlertTitle>
            <AlertDescription>
              Save or print this page now. The confirmed registration and ticket
              remain valid.
            </AlertDescription>
          </Alert>
        ) : null}

        <TicketStub
          eventName={management.event.name}
          attendeeName={management.attendeeName}
          scheduleLabel={formatCompactRange(
            management.event.startsAt,
            management.event.endsAt,
            management.event.eventTimeZone,
          )}
          venueName={management.event.venueName}
          status={
            activeTicket
              ? {
                  label:
                    management.registrationStatus === "confirmed"
                      ? "Confirmed"
                      : `Registration ${management.registrationStatus}`,
                  variant: "success",
                }
              : {
                  label: `Ticket ${management.ticket?.status ?? "inactive"}`,
                  variant: "destructive",
                }
          }
          qrDataUrl={qrDataUrl}
          formattedCode={formattedCode}
          ticketCodeLabel={activeTicket?.code}
          action={activeTicket ? <PrintTicketButton /> : null}
        />

        {/* Everything below the ticket is administration, not presentation. */}
        <section className="panel divide-y print:hidden">
          <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <dt className="flex items-center gap-2 font-semibold">
                <IconCalendarEvent aria-hidden="true" className="size-5 shrink-0" />
                When
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {formatEventRange(
                  management.event.startsAt,
                  management.event.endsAt,
                  management.event.eventTimeZone,
                )}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 font-semibold">
                <IconMapPin aria-hidden="true" className="size-5 shrink-0" />
                Where
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                <span className="block text-foreground">
                  {management.event.venueName}
                </span>
                {management.event.venueAddress}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <IconShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              This page is private. At the door, show only the QR code or the
              ticket code.
            </p>
            <PendingLink
              href={`/e/${management.event.slug}`}
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
              pendingLabel="Opening event"
              referrerPolicy="no-referrer"
            >
              View event
            </PendingLink>
          </div>
        </section>

        {activeTicket ? (
          <section className="print:hidden">
            <RegistrationManagementControls
              token={token}
              attendeeName={management.attendeeName}
              email={management.email}
              fields={management.fields}
              canEdit={management.canEdit}
              canReplaceOrCancel={management.canReplaceOrCancel}
              unavailable={management.event.suspended}
            />
          </section>
        ) : null}
      </main>
    </div>
  );
}
