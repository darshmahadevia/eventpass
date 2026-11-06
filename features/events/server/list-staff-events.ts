import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { event, eventStaff } from "@/lib/db/schema";

export async function listStaffEvents(staffUserId: string) {
  return db
    .select({
      id: event.id,
      name: event.name,
      status: event.status,
      suspended: event.suspended,
      eventTimeZone: event.eventTimeZone,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      checkInOpensAt: event.checkInOpensAt,
      checkInClosesAt: event.checkInClosesAt,
      venueName: event.venueName,
      capacity: event.capacity,
      role: eventStaff.role,
      confirmed: sql<number>`(
        select count(*)::int from registration
        where registration.event_id = ${event.id}
          and registration.status = 'confirmed'
      )`,
      arrived: sql<number>`(
        select count(*)::int from check_in
        where check_in.event_id = ${event.id}
          and check_in.invalidated_at is null
      )`,
    })
    .from(eventStaff)
    .innerJoin(event, eq(event.id, eventStaff.eventId))
    .where(eq(eventStaff.userId, staffUserId))
    .orderBy(asc(event.startsAt), asc(event.name));
}

export type StaffEvent = Awaited<ReturnType<typeof listStaffEvents>>[number];
