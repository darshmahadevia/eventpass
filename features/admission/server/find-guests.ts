import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { checkIn, registration, ticket } from "@/lib/db/schema";
import { escapeLikePattern } from "@/lib/like-pattern";

import { getScannerEvent } from "./scanner";

/**
 * Name lookup for a phone with no saved guest list. Staff on the door can
 * already hold this same list, so this exposes nothing new to them.
 */
export async function findGuests(
  eventId: string,
  actorUserId: string,
  query: string,
) {
  const scannerEvent = await getScannerEvent(eventId, actorUserId);
  if (!scannerEvent) return [];

  const pattern = `%${escapeLikePattern(query.trim())}%`;
  const rows = await db
    .select({
      ticketCode: ticket.code,
      displayName: registration.attendeeName,
      arrived: sql<boolean>`exists (
        select 1 from ${checkIn}
        where ${checkIn.ticketId} = ${ticket.id}
          and ${checkIn.invalidatedAt} is null
      )`,
    })
    .from(ticket)
    .innerJoin(registration, eq(registration.id, ticket.registrationId))
    .where(
      and(
        eq(ticket.eventId, eventId),
        eq(ticket.status, "active"),
        sql`${registration.attendeeName} ilike ${pattern} escape '\\'`,
      ),
    )
    .orderBy(asc(registration.attendeeName))
    .limit(6);

  return rows;
}
