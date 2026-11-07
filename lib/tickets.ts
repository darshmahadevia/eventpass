import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { normalizeTicketCode } from "@/lib/utils";

/** Looks up a ticket and its event by code. The code is the bearer credential. */
export const getTicket = cache(async (rawCode: string) => {
  const code = normalizeTicketCode(rawCode);
  if (code.length !== 16) return null;
  const [row] = await db
    .select({ registration: schema.registrations, event: schema.events })
    .from(schema.registrations)
    .innerJoin(schema.events, eq(schema.events.id, schema.registrations.eventId))
    .where(eq(schema.registrations.ticketCode, code));
  return row ?? null;
});
