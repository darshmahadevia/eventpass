import { IconCalendarPlus, IconCircleCheck, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/client";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, Card, Logo, Notice } from "@/components/ui";
import { formatEventRange, formatTime } from "@/lib/time";
import { getTicket } from "@/lib/tickets";
import { formatTicketCode } from "@/lib/utils";
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
  const qr = valid
    ? await QRCode.toString(registration.ticketCode, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
    : null;

  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-sm">
        <Link href="/" className="no-print mb-6 flex justify-center">
          <Logo />
        </Link>

        {isNew && valid && (
          <div className="no-print mb-4">
            <Notice tone="success">You&apos;re registered! We also emailed this ticket to {registration.email}.</Notice>
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="bg-accent px-6 py-5 text-accent-fg">
            <p className="text-sm font-medium opacity-80">Ticket</p>
            <h1 className="text-xl font-bold text-balance">{event.title}</h1>
          </div>
          <div className="grid gap-5 p-6">
            <div>
              <p className="text-sm text-muted">Guest</p>
              <p className="text-lg font-semibold">{registration.name}</p>
            </div>

            {qr ? (
              <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border bg-white p-6">
                <div
                  className="size-52 [&_svg]:size-full"
                  role="img"
                  aria-label="Ticket QR code"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
                <p className="font-mono text-sm tracking-wider text-neutral-700">{formatTicketCode(registration.ticketCode)}</p>
              </div>
            ) : (
              <Notice tone="danger">
                {eventCancelled ? "This event has been cancelled." : "This registration was cancelled."} The ticket
                is no longer valid.
              </Notice>
            )}

            {valid && registration.checkedInAt && (
              <Notice tone="success">
                <span className="flex items-center gap-2">
                  <IconCircleCheck className="size-4" /> Checked in at {formatTime(registration.checkedInAt, event.timeZone)}
                </span>
              </Notice>
            )}

            <div className="grid gap-2 text-sm">
              <p className="font-medium">{formatEventRange(event.startsAt, event.endsAt, event.timeZone)}</p>
              {event.location && (
                <p className="flex gap-2 text-muted">
                  <IconMapPin className="size-4 shrink-0" /> {event.location}
                </p>
              )}
            </div>
          </div>
        </Card>

        {valid && !ended && (
          <div className="no-print mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href={`/t/${registration.ticketCode}/calendar`} variant="secondary" prefetch={false}>
                <IconCalendarPlus className="size-4" /> Calendar
              </ButtonLink>
              <PrintButton />
            </div>
            {!registration.checkedInAt && (
              <form action={cancelTicketAction.bind(null, registration.ticketCode)} className="text-center">
                <SubmitButton
                  variant="ghost"
                  className="text-muted"
                  confirm="Cancel your registration? Your ticket will stop working and your spot goes to someone else."
                >
                  Can&apos;t make it? Cancel registration
                </SubmitButton>
              </form>
            )}
          </div>
        )}
        <p className="no-print mt-6 text-center">
          <Link href={`/e/${event.slug}`} className="text-sm text-muted hover:text-fg">
            Event page
          </Link>
        </p>
      </div>
    </div>
  );
}
