import "server-only";

import { cache } from "react";
import { and, count, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  event,
  eventStaff,
  registration,
  registrationField,
  staffInvitation,
} from "@/lib/db/schema";

const eventSelection = {
  id: event.id,
  name: event.name,
  description: event.description,
  slug: event.slug,
  status: event.status,
  eventTimeZone: event.eventTimeZone,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  venueName: event.venueName,
  venueAddress: event.venueAddress,
  venueMapUrl: event.venueMapUrl,
  capacity: event.capacity,
  registrationOpensAt: event.registrationOpensAt,
  registrationClosesAt: event.registrationClosesAt,
  checkInOpensAt: event.checkInOpensAt,
  checkInClosesAt: event.checkInClosesAt,
  publishedAt: event.publishedAt,
  canceledAt: event.canceledAt,
  cancellationReason: event.cancellationReason,
  suspended: event.suspended,
};

export type EventDetails = typeof event.$inferSelect;

// Deduplicated per request: the event workspace layout and the page rendering
// inside it both need the Event, and without this each render pass would issue
// the same query twice.
export const getOrganizerEvent = cache(async function getOrganizerEvent(
  eventId: string,
  staffUserId: string,
) {
  const [result] = await db
    .select({ ...eventSelection, role: eventStaff.role })
    .from(eventStaff)
    .innerJoin(event, eq(event.id, eventStaff.eventId))
    .where(
      and(
        eq(event.id, eventId),
        eq(eventStaff.userId, staffUserId),
        inArray(eventStaff.role, ["owner", "organizer"]),
      ),
    )
    .limit(1);

  return result ?? null;
});

export async function eventHasRegistrations(eventId: string) {
  const [row] = await db
    .select({ id: registration.id })
    .from(registration)
    .where(eq(registration.eventId, eventId))
    .limit(1);
  return Boolean(row);
}

/** What an owner has already done on a draft, for its setup checklist. */
export async function getDraftProgress(eventId: string) {
  const [[questions], [staff], [invited]] = await Promise.all([
    db
      .select({ total: count() })
      .from(registrationField)
      .where(
        and(
          eq(registrationField.eventId, eventId),
          eq(registrationField.archived, false),
        ),
      ),
    db
      .select({ total: count() })
      .from(eventStaff)
      .where(eq(eventStaff.eventId, eventId)),
    db
      .select({ total: count() })
      .from(staffInvitation)
      .where(
        and(
          eq(staffInvitation.eventId, eventId),
          isNull(staffInvitation.consumedAt),
          isNull(staffInvitation.revokedAt),
        ),
      ),
  ]);
  return {
    questions: questions?.total ?? 0,
    // The owner is on the staff list already, so they do not count as help.
    teammates: Math.max(0, (staff?.total ?? 1) - 1) + (invited?.total ?? 0),
  };
}

export const getPublishedEvent = cache(async function getPublishedEvent(
  slug: string,
) {
  const [result] = await db
    .select(eventSelection)
    .from(event)
    .where(
      and(
        eq(event.slug, slug),
        inArray(event.status, ["published", "canceled"]),
      ),
    )
    .limit(1);

  return result ?? null;
});
