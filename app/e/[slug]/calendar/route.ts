import { getPublishedEvent } from "@/features/events/server/get-event";

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 text: commas, semicolons, backslashes and newlines are escaped. */
function text(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Same visibility as the public event page, so it exposes nothing that page
// does not. Times are UTC instants: every calendar app shows them in its own
// zone, which is what a guest travelling to the event wants.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) return new Response("Not found", { status: 404 });

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventPass//Tickets//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@eventpass`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${text(event.name)}`,
    `LOCATION:${text(`${event.venueName}, ${event.venueAddress}`)}`,
    `URL:${new URL(`/e/${slug}`, request.url).href}`,
    `STATUS:${event.status === "canceled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
