import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { canScan, checkIn } from "@/lib/events";
import { normalizeTicketCode } from "@/lib/utils";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authorize(eventId: string) {
  const user = await getUser();
  if (!user) return { error: json({ error: "Sign in again to keep scanning." }, 401) };
  const event = await canScan(user, eventId);
  if (!event) return { error: json({ error: "You're not on the door team for this event." }, 403) };
  return { user, event };
}

/** The guest list snapshot the scanner keeps on the device for offline use. */
export async function GET(_: Request, { params }: RouteContext<"/api/scan/[eventId]">) {
  const auth = await authorize((await params).eventId);
  if ("error" in auth) return auth.error;
  const guests = await db
    .select({
      code: schema.registrations.ticketCode,
      name: schema.registrations.name,
      status: schema.registrations.status,
      checkedInAt: schema.registrations.checkedInAt,
    })
    .from(schema.registrations)
    .where(eq(schema.registrations.eventId, auth.event.id))
    .orderBy(asc(schema.registrations.name));
  return json({ eventStatus: auth.event.status, guests });
}

const scansSchema = z.object({
  scans: z
    .array(z.object({ code: z.string().max(200), at: z.iso.datetime() }))
    .min(1)
    .max(500),
});

/** Checks in one live scan or a batch of queued offline scans. */
export async function POST(request: Request, { params }: RouteContext<"/api/scan/[eventId]">) {
  const auth = await authorize((await params).eventId);
  if ("error" in auth) return auth.error;
  const parsed = scansSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid scan payload." }, 400);

  const results = [];
  for (const scan of parsed.data.scans) {
    const code = normalizeTicketCode(scan.code);
    results.push(
      auth.event.status === "cancelled"
        ? { code, status: "event_cancelled" as const }
        : { code, ...(await checkIn(auth.event.id, code, auth.user.email, new Date(scan.at))) },
    );
  }
  return json({ results });
}
