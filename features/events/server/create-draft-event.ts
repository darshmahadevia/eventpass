import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../lib/db";
import { event, eventStaff, user } from "../../../lib/db/schema";

import {
  eventScheduleInstants,
  isIanaTimeZone,
  localDateTimeInTimeZoneToUtc,
} from "./event-schedule";

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.");

export const createDraftEventInputSchema = z
  .object({
    name: z.string().trim().min(1, "Give your event a name.").max(160),
    description: z
      .string()
      .trim()
      .min(1, "Tell guests what to expect.")
      .max(4_000),
    slug: z
      .string()
      .trim()
      .min(3, "Use at least 3 characters.")
      .max(80)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and single hyphens.",
      ),
    eventTimeZone: z
      .string()
      .trim()
      .min(1, "Choose a time zone.")
      .refine(isIanaTimeZone, "Choose a time zone from the list."),
    startsAtLocal: localDateTime,
    endsAtLocal: localDateTime,
    venueName: z.string().trim().min(1, "Enter the venue name.").max(160),
    venueAddress: z.string().trim().min(1, "Enter the venue address.").max(500),
    venueMapUrl: z
      .union([z.literal(""), z.httpUrl("Use a full link starting with https://")])
      .transform((value) => value || null),
    capacity: z.coerce
      .number()
      .int("Capacity must be a whole number.")
      .min(1, "Capacity must be at least 1.")
      .max(3_000, "Capacity cannot exceed 3,000."),
    registrationOpensAtLocal: localDateTime,
    registrationClosesAtLocal: localDateTime,
    checkInOpensAtLocal: localDateTime,
    checkInClosesAtLocal: localDateTime,
  })
  .superRefine((input, context) => {
    const dates = {
      startsAtLocal: localDateTimeInTimeZoneToUtc(
        input.startsAtLocal,
        input.eventTimeZone,
      ),
      endsAtLocal: localDateTimeInTimeZoneToUtc(
        input.endsAtLocal,
        input.eventTimeZone,
      ),
      registrationOpensAtLocal: localDateTimeInTimeZoneToUtc(
        input.registrationOpensAtLocal,
        input.eventTimeZone,
      ),
      registrationClosesAtLocal: localDateTimeInTimeZoneToUtc(
        input.registrationClosesAtLocal,
        input.eventTimeZone,
      ),
      checkInOpensAtLocal: localDateTimeInTimeZoneToUtc(
        input.checkInOpensAtLocal,
        input.eventTimeZone,
      ),
      checkInClosesAtLocal: localDateTimeInTimeZoneToUtc(
        input.checkInClosesAtLocal,
        input.eventTimeZone,
      ),
    };
    const dateFields = [
      "startsAtLocal",
      "endsAtLocal",
      "registrationOpensAtLocal",
      "registrationClosesAtLocal",
      "checkInOpensAtLocal",
      "checkInClosesAtLocal",
    ] as const satisfies ReadonlyArray<keyof typeof dates>;

    for (const field of dateFields) {
      if (!dates[field] && input[field]) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "This time does not exist in the event time zone. Clocks change that day.",
        });
      }
    }

    if (dates.startsAtLocal && dates.endsAtLocal && dates.startsAtLocal >= dates.endsAtLocal) {
      context.addIssue({
        code: "custom",
        path: ["endsAtLocal"],
        message: "The event must end after it starts.",
      });
    }

    if (
      dates.registrationOpensAtLocal &&
      dates.registrationClosesAtLocal &&
      dates.registrationOpensAtLocal >= dates.registrationClosesAtLocal
    ) {
      context.addIssue({
        code: "custom",
        path: ["registrationClosesAtLocal"],
        message: "Registration must close after it opens.",
      });
    }

    if (
      dates.registrationClosesAtLocal &&
      dates.startsAtLocal &&
      dates.registrationClosesAtLocal > dates.startsAtLocal
    ) {
      context.addIssue({
        code: "custom",
        path: ["registrationClosesAtLocal"],
        message: "Registration cannot close after the event starts.",
      });
    }

    if (
      dates.checkInOpensAtLocal &&
      dates.checkInClosesAtLocal &&
      dates.checkInOpensAtLocal >= dates.checkInClosesAtLocal
    ) {
      context.addIssue({
        code: "custom",
        path: ["checkInClosesAtLocal"],
        message: "Check-in must close after it opens.",
      });
    }

    if (
      dates.checkInOpensAtLocal &&
      dates.endsAtLocal &&
      dates.checkInOpensAtLocal > dates.endsAtLocal
    ) {
      context.addIssue({
        code: "custom",
        path: ["checkInOpensAtLocal"],
        message: "Check-in must open before the event ends.",
      });
    }

    if (
      dates.checkInClosesAtLocal &&
      dates.startsAtLocal &&
      dates.checkInClosesAtLocal < dates.startsAtLocal
    ) {
      context.addIssue({
        code: "custom",
        path: ["checkInClosesAtLocal"],
        message: "Check-in must stay open until the event starts.",
      });
    }
  });

export type CreateDraftEventInput = z.input<typeof createDraftEventInputSchema>;

export class StaffCannotCreateEventError extends Error {}

export async function createDraftEvent(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = createDraftEventInputSchema.parse(rawInput);
  const schedule = eventScheduleInstants(input);

  return db.transaction(async (transaction) => {
    const [actor] = await transaction
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.id, actorUserId),
          eq(user.emailVerified, true),
          eq(user.suspended, false),
        ),
      )
      .limit(1);

    if (!actor) {
      throw new StaffCannotCreateEventError("The staff user cannot create events.");
    }

    const [createdEvent] = await transaction
      .insert(event)
      .values({
        name: input.name,
        description: input.description,
        slug: input.slug,
        eventTimeZone: input.eventTimeZone,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        venueMapUrl: input.venueMapUrl,
        capacity: input.capacity,
        registrationOpensAt: schedule.registrationOpensAt,
        registrationClosesAt: schedule.registrationClosesAt,
        checkInOpensAt: schedule.checkInOpensAt,
        checkInClosesAt: schedule.checkInClosesAt,
      })
      .returning({ id: event.id });

    if (!createdEvent) {
      throw new Error("Could not create the event.");
    }

    await transaction.insert(eventStaff).values({
      eventId: createdEvent.id,
      userId: actor.id,
      role: "owner",
    });

    return createdEvent;
  });
}
