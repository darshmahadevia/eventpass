import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getOrganizerEvent } from "@/features/events/server/get-event";
import { db } from "@/lib/db";
import { auditEntry, registration } from "@/lib/db/schema";
import { isUniqueViolation } from "@/lib/is-unique-violation";

const correctionSchema = z.object({
  name: z.string().trim().min(1, "Enter the guest's name.").max(200),
  email: z.email("Enter a valid email address.").trim().max(320),
});

export type GuestCorrectionResult =
  | { outcome: "saved"; emailChanged: boolean }
  | { outcome: "error"; message: string };

/**
 * The fix for a typo. A guest can't correct their own address, and a ticket sent
 * to the wrong one reaches nobody, so an organizer has to be able to. Recorded
 * in the audit log like every other correction.
 */
export async function correctGuest(
  eventId: string,
  registrationId: string,
  actorUserId: string,
  values: { name: string; email: string },
): Promise<GuestCorrectionResult> {
  const organizerEvent = await getOrganizerEvent(eventId, actorUserId);
  if (!organizerEvent) return { outcome: "error", message: "You can't change this guest." };

  const parsed = correctionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Check the name and email.",
    };
  }
  const { name, email } = parsed.data;

  try {
    return await db.transaction(async (transaction) => {
      const [current] = await transaction
        .select({ name: registration.attendeeName, email: registration.email })
        .from(registration)
        .where(
          and(
            eq(registration.id, registrationId),
            eq(registration.eventId, eventId),
            inArray(registration.status, ["unconfirmed", "confirmed", "waitlisted"]),
          ),
        )
        .for("update")
        .limit(1);
      if (!current) {
        return { outcome: "error", message: "This guest can no longer be changed." } as const;
      }

      const emailChanged = current.email.toLowerCase() !== email.toLowerCase();
      await transaction
        .update(registration)
        .set({
          attendeeName: name,
          email,
          normalizedEmail: email.toLowerCase(),
          updatedAt: new Date(),
        })
        .where(eq(registration.id, registrationId));
      await transaction.insert(auditEntry).values({
        eventId,
        actorUserId,
        action: "registration.corrected",
        targetType: "registration",
        targetId: registrationId,
        metadata: {
          ...(current.name !== name ? { "Name was": current.name } : {}),
          ...(emailChanged ? { "Email was": current.email } : {}),
        },
      });
      return { outcome: "saved", emailChanged } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { outcome: "error", message: "Another guest already uses that email." };
    }
    throw error;
  }
}

export async function recordGuestCanceled(
  eventId: string,
  registrationId: string,
  actorUserId: string,
) {
  await db.insert(auditEntry).values({
    eventId,
    actorUserId,
    action: "registration.canceled_by_organizer",
    targetType: "registration",
    targetId: registrationId,
  });
}
