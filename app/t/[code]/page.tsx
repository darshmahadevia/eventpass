import { IconCalendarPlus, IconCircleCheck } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/client";
import { SubmitButton } from "@/components/submit-button";
import { ThemeSwitcher } from "@/components/theme";
import { Stamp } from "@/components/ticket";
import { ButtonLink, Logo } from "@/components/ui";
import { stockFor } from "@/lib/stock";
import { dateParts, formatTime, formatTimeRange } from "@/lib/time";
import { getTicket } from "@/lib/tickets";
import { cn, formatTicketCode } from "@/lib/utils";
import { cancelTicketAction } from "./actions";

export const metadata = { title: "Your ticket", robots: { index: false } };

export default async function TicketPage({ params, searchParams }: PageProps<"/t/[code]">) {
  const ticket = await getTicket((await params).code);
  if (!ticket) notFound();
  const { event, registration } = ticket;
  const isNew = (await searchParams).new === "1";

  const cancelled = registration.status === "cancelled";
  const eventCancelled = event.status === "cancelled";
  const ended = event.endsAt < new Date();
  const valid = !cancelled && !eventCancelled;
  const checkedIn = valid && registration.checkedInAt;
  const qr = await QRCode.toString(registration.ticketCode, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const date = dateParts(event.startsAt, event.timeZone);

  return (
    <div data-stock={stockFor(event.id)} className="flex min-h-dvh flex-col px-4 pt-5 pb-10">
      <header className="no-print mx-auto flex w-full max-w-md items-center justify-between">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
        <ThemeSwitcher />
      </header>

      <main className="mx-auto mt-8 w-full max-w-md flex-1">
        {isNew && valid && (
          <div className="no-print mb-6 text-center">
            <h1 className="display text-5xl">You&apos;re in.</h1>
            <p className="mt-2 text-muted">
              We also sent this ticket to <span className="font-semibold text-fg">{registration.email}</span>.
            </p>
          </div>
        )}

        {/* The ticket is paper in both themes: stock on top, white behind the QR so it always scans. */}
        <article className={cn("paper-shadow relative", isNew && valid && "print-out", !valid && "grayscale")}>
          <div className="notch-b relative rounded-t-3xl bg-accent px-6 pt-6 pb-7 text-ink">
            <div className="flex items-baseline justify-between gap-4 text-sm font-semibold">
              <span>Admit one</span>
              <span>
                {date.weekday}, {date.month} {date.day}
              </span>
            </div>
            <h1 className={cn("display mt-5 text-balance", event.title.length > 40 ? "text-3xl" : "text-4xl")}>
              {isNew && valid ? <span className="sr-only">Ticket for </span> : null}
              {event.title}
            </h1>
            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 text-[0.9375rem] leading-snug">
              <div className="col-span-2">
                <dt className="text-sm opacity-70">Guest</dt>
                <dd className="font-semibold">{registration.name}</dd>
              </div>
              <div className={event.location ? undefined : "col-span-2"}>
                <dt className="text-sm opacity-70">Time</dt>
                <dd className="font-semibold">{formatTimeRange(event.startsAt, event.endsAt, event.timeZone)}</dd>
              </div>
              {event.location && (
                <div>
                  <dt className="text-sm opacity-70">Place</dt>
                  <dd className="font-semibold break-words">{event.location}</dd>
                </div>
              )}
            </dl>
            <span aria-hidden className="perf-x absolute inset-x-5 -bottom-px" />
          </div>

          <div className="notch-t relative grid justify-items-center rounded-b-3xl bg-white px-6 pt-7 pb-6 text-ink">
            <div
              className={cn("size-56 [&_svg]:size-full", !valid && "opacity-25")}
              role="img"
              aria-label={valid ? "Ticket QR code" : "Void ticket QR code"}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="mt-4 font-mono text-[0.9375rem] font-medium tracking-wide">
              {formatTicketCode(registration.ticketCode)}
            </p>
            {!valid && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/85">
                <Stamp tone="void">{eventCancelled ? "Event cancelled" : "Cancelled"}</Stamp>
              </div>
            )}
            {checkedIn && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/85">
                <Stamp tone="go">Checked in {formatTime(registration.checkedInAt!, event.timeZone)}</Stamp>
              </div>
            )}
          </div>
        </article>

        {!valid && (
          <p className="no-print mt-5 text-center text-muted">
            {eventCancelled ? "The organizer cancelled this event." : "You cancelled this registration."} This ticket
            won&apos;t admit anyone.
          </p>
        )}
        {valid && !ended && !checkedIn && (
          <p className="no-print mt-5 flex items-center justify-center gap-2 text-center text-sm text-muted">
            <IconCircleCheck aria-hidden className="size-4 text-success" />
            Show this at the door. It works on screen or on paper.
          </p>
        )}

        {valid && !ended && (
          <div className="no-print mt-5 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href={`/t/${registration.ticketCode}/calendar`} variant="secondary" prefetch={false}>
                <IconCalendarPlus className="size-4" /> Add to calendar
              </ButtonLink>
              <PrintButton />
            </div>
          </div>
        )}

        <div className="no-print mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
          <Link href={`/e/${event.slug}`} className="font-medium text-muted underline-offset-4 hover:text-fg hover:underline">
            Event details
          </Link>
          {valid && !ended && !registration.checkedInAt && (
            <form action={cancelTicketAction.bind(null, registration.ticketCode)}>
              <SubmitButton
                variant="ghost"
                size="sm"
                className="px-2 font-medium text-muted hover:bg-transparent hover:text-danger"
                confirmTitle="Cancel your registration?"
                confirm="Your ticket stops working and your spot goes to someone else."
                confirmLabel="Cancel registration"
              >
                Can&apos;t make it?
              </SubmitButton>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
