import "server-only";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser, type User } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { Event, FormField, Registration } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { formatEventRange } from "@/lib/time";
import { appUrl, isUuid, newTicketCode } from "@/lib/utils";

const { events, eventStaff, registrations } = schema;

/** The event, if the signed-in user owns it; 404 otherwise. */
export async function getOwnedEvent(eventId: string) {
  const user = await requireUser();
  if (!isUuid(eventId)) notFound();
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.ownerId, user.id)),
  });
  if (!event) notFound();
  return { user, event };
}

/** Whether the user may run the door scanner: the owner or listed staff. */
export async function canScan(user: User, eventId: string) {
  if (!isUuid(eventId)) return null;
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return null;
  if (event.ownerId === user.id) return event;
  const staff = await db.query.eventStaff.findFirst({
    where: and(eq(eventStaff.eventId, eventId), eq(eventStaff.email, user.email)),
  });
  return staff ? event : null;
}

export async function countRegistered(eventId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(registrations)
    .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "registered")));
  return row?.n ?? 0;
}

export type RegistrationClosedReason = "draft" | "cancelled" | "ended" | "full" | null;

export function closedReason(event: Event, registered: number): RegistrationClosedReason {
  if (event.status === "draft") return "draft";
  if (event.status === "cancelled") return "cancelled";
  if (event.endsAt <= new Date()) return "ended";
  if (event.capacity !== null && registered >= event.capacity) return "full";
  return null;
}

/** Validates submitted answers against the event's form. Returns answers or a field-keyed error map. */
export function parseAnswers(form: FormField[], data: FormData) {
  const answers: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of form) {
    const raw = data.get(`q_${field.id}`);
    let value = typeof raw === "string" ? raw.trim().slice(0, 2000) : "";
    if (field.type === "checkbox") value = value ? "Yes" : "";
    if (field.type === "select" && value && !field.options.includes(value)) value = "";
    if (field.required && !value) errors[field.id] = "This field is required.";
    if (value) answers[field.id] = value;
  }
  return { answers, errors };
}

type NewRegistration = { name: string; email: string; answers: Record<string, string> };

export type RegisterResult =
  | { ok: true; registration: Registration }
  | { ok: false; reason: Exclude<RegistrationClosedReason, null> | "duplicate"; existing?: Registration };

/**
 * Registers a guest. The event row is locked for the transaction so concurrent
 * sign-ups can't overshoot capacity. Organizers adding guests by hand
 * (`enforceLimits: false`) may exceed capacity or add to a closed event.
 */
export async function register(
  eventId: string,
  guest: NewRegistration,
  { enforceLimits }: { enforceLimits: boolean },
): Promise<RegisterResult> {
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!event) return { ok: false, reason: "cancelled" };

    const existing = await tx.query.registrations.findFirst({
      where: and(
        eq(registrations.eventId, eventId),
        eq(registrations.email, guest.email),
        eq(registrations.status, "registered"),
      ),
    });
    if (existing) return { ok: false, reason: "duplicate", existing };

    const [row] = await tx
      .select({ n: count() })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "registered")));
    const reason = closedReason(event, row?.n ?? 0);
    if (reason === "cancelled" || (enforceLimits && reason)) return { ok: false, reason };

    const [registration] = await tx
      .insert(registrations)
      .values({ eventId, ...guest, ticketCode: newTicketCode() })
      .returning();
    if (!registration) throw new Error("Insert returned no row");
    return { ok: true, registration };
  });
}

export async function sendTicketEmail(event: Event, registration: Registration) {
  await sendEmail({
    to: registration.email,
    subject: `Your ticket for ${event.title}`,
    text: [
      `Hi ${registration.name},`,
      "",
      `You're registered for ${event.title}.`,
      formatEventRange(event.startsAt, event.endsAt, event.timeZone),
      ...(event.location ? [event.location] : []),
      "",
      "Your ticket (show the QR code at the door):",
      appUrl(`/t/${registration.ticketCode}`),
    ].join("\n"),
  });
}

export type CheckInResult =
  | { status: "admitted"; guest: GuestSummary }
  | { status: "already"; guest: GuestSummary }
  | { status: "cancelled"; guest: GuestSummary }
  | { status: "not_found" };

export type GuestSummary = {
  name: string;
  ticketCode: string;
  status: Registration["status"];
  checkedInAt: string | null;
};

const summary = (r: Registration): GuestSummary => ({
  name: r.name,
  ticketCode: r.ticketCode,
  status: r.status,
  checkedInAt: r.checkedInAt?.toISOString() ?? null,
});

/**
 * Admits a ticket exactly once. The conditional UPDATE is the arbiter, so two
 * doors scanning the same ticket at the same moment can't both admit it.
 * `at` is when the scan happened (offline scans sync later), capped at now.
 */
export async function checkIn(eventId: string, code: string, by: string, at = new Date()) {
  const when = at > new Date() ? new Date() : at;
  const [admitted] = await db
    .update(registrations)
    .set({ checkedInAt: when, checkedInBy: by })
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.ticketCode, code),
        eq(registrations.status, "registered"),
        isNull(registrations.checkedInAt),
      ),
    )
    .returning();
  if (admitted) return { status: "admitted", guest: summary(admitted) } satisfies CheckInResult;

  const found = await db.query.registrations.findFirst({
    where: and(eq(registrations.eventId, eventId), eq(registrations.ticketCode, code)),
  });
  if (!found) return { status: "not_found" } satisfies CheckInResult;
  if (found.status === "cancelled") return { status: "cancelled", guest: summary(found) } satisfies CheckInResult;
  return { status: "already", guest: summary(found) } satisfies CheckInResult;
}

export async function undoCheckIn(eventId: string, registrationId: string) {
  await db
    .update(registrations)
    .set({ checkedInAt: null, checkedInBy: null })
    .where(and(eq(registrations.eventId, eventId), eq(registrations.id, registrationId)));
}

export async function getEventStats(eventId: string) {
  const [row] = await db
    .select({
      registered: sql<number>`count(*) filter (where ${registrations.status} = 'registered')`.mapWith(Number),
      checkedIn: sql<number>`count(*) filter (where ${registrations.status} = 'registered' and ${registrations.checkedInAt} is not null)`.mapWith(Number),
      cancelled: sql<number>`count(*) filter (where ${registrations.status} = 'cancelled')`.mapWith(Number),
    })
    .from(registrations)
    .where(eq(registrations.eventId, eventId));
  return row ?? { registered: 0, checkedIn: 0, cancelled: 0 };
}
