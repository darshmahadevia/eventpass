import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getOwnedEvent } from "@/lib/events";

const cell = (value: string) => {
  // Neutralize spreadsheet formulas, then quote.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(_: Request, { params }: RouteContext<"/events/[eventId]/guests/export">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  const guests = await db.query.registrations.findMany({
    where: eq(schema.registrations.eventId, event.id),
    orderBy: asc(schema.registrations.createdAt),
  });

  const header = ["Name", "Email", "Status", "Registered at", "Checked in at", "Ticket code", ...event.form.map((f) => f.label)];
  const rows = guests.map((g) => [
    g.name,
    g.email,
    g.status,
    g.createdAt.toISOString(),
    g.checkedInAt?.toISOString() ?? "",
    g.ticketCode,
    ...event.form.map((f) => g.answers[f.id] ?? ""),
  ]);
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-guests.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
