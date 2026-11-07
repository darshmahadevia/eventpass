import { getTicket } from "@/lib/tickets";
import { appUrl } from "@/lib/utils";

const icsDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (value: string) => value.replace(/[\\,;]/g, "\\$&").replace(/\r?\n/g, "\\n");

export async function GET(_: Request, { params }: RouteContext<"/t/[code]/calendar">) {
  const ticket = await getTicket((await params).code);
  if (!ticket) return new Response("Not found", { status: 404 });
  const { event, registration } = ticket;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventPass//EN",
    "BEGIN:VEVENT",
    `UID:${registration.id}@eventpass`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.location)}`,
    `DESCRIPTION:${icsText(`Your ticket: ${appUrl(`/t/${registration.ticketCode}`)}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
