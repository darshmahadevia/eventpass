"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeEmail, requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { EventStatus, FormField } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { checkIn, getOwnedEvent, parseAnswers, register, sendTicketEmail, undoCheckIn } from "@/lib/events";
import { formatEventRange, isValidTimeZone, zonedToUtc } from "@/lib/time";
import { appUrl, isDemoEmail } from "@/lib/utils";

const { events, eventStaff, registrations } = schema;

export type FormState = { error?: string; errors?: Record<string, string>; values?: Record<string, string>; ok?: boolean };

const refresh = (eventId: string) => revalidatePath(`/events/${eventId}`, "layout");

// ── Event details ───────────────────────────────────────────────────────────

export async function saveEventAction(eventId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const values = {
    title: get("title"),
    description: get("description"),
    location: get("location"),
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    timeZone: get("timeZone"),
    capacity: get("capacity"),
  };

  const errors: Record<string, string> = {};
  if (!values.title) errors.title = "Give the event a name.";
  else if (values.title.length > 120) errors.title = "Keep the name under 120 characters.";
  const zoneOk = isValidTimeZone(values.timeZone);
  if (!zoneOk) errors.timeZone = "Choose a time zone.";
  const startsAt = zoneOk ? zonedToUtc(values.startsAt, values.timeZone) : null;
  const endsAt = zoneOk ? zonedToUtc(values.endsAt, values.timeZone) : null;
  if (!startsAt) errors.startsAt = "Choose a start time.";
  if (!endsAt) errors.endsAt = "Choose an end time.";
  else if (startsAt && endsAt <= startsAt) errors.endsAt = "The event must end after it starts.";
  const capacity = values.capacity ? Number(values.capacity) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
    errors.capacity = "Use a whole number above zero, or leave empty for no limit.";
  }
  if (Object.keys(errors).length || !startsAt || !endsAt) return { errors, values };

  const data = {
    title: values.title,
    description: values.description.slice(0, 5000),
    location: values.location.slice(0, 300),
    startsAt,
    endsAt,
    timeZone: values.timeZone,
    capacity,
  };

  if (eventId) {
    await getOwnedEvent(eventId);
    await db.update(events).set(data).where(eq(events.id, eventId));
    refresh(eventId);
    return { ok: true };
  }

  const slugBase = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const [created] = await db
    .insert(events)
    .values({
      ...data,
      ownerId: user.id,
      slug: `${slugBase || "event"}-${randomBytes(3).toString("hex")}`,
      form: [{ id: "f_" + randomBytes(4).toString("hex"), label: "Anything we should know?", type: "textarea", required: false, options: [] }],
    })
    .returning({ id: events.id });
  if (!created) return { error: "Couldn't create the event.", values };
  redirect(`/events/${created.id}`);
}

export async function setStatusAction(eventId: string, status: EventStatus) {
  const { user, event } = await getOwnedEvent(eventId);
  if (event.status === "cancelled") return;
  await db.update(events).set({ status }).where(eq(events.id, eventId));

  if (status === "cancelled" && !isDemoEmail(user.email)) {
    const guests = await db.query.registrations.findMany({
      where: and(eq(registrations.eventId, eventId), eq(registrations.status, "registered")),
    });
    const text = `${event.title} (${formatEventRange(event.startsAt, event.endsAt, event.timeZone)}) has been cancelled by the organizer. Your ticket is no longer valid.`;
    for (let i = 0; i < guests.length; i += 10) {
      await Promise.allSettled(
        guests.slice(i, i + 10).map((g) => sendEmail({ to: g.email, subject: `Cancelled: ${event.title}`, text })),
      );
    }
  }
  refresh(eventId);
}

export async function deleteEventAction(eventId: string) {
  await getOwnedEvent(eventId);
  await db.delete(events).where(eq(events.id, eventId));
  redirect("/events");
}

// ── Registration form ───────────────────────────────────────────────────────

const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,40}$/i),
  label: z.string().trim().min(1, "Every question needs a label.").max(200),
  type: z.enum(["text", "textarea", "select", "checkbox"]),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(100)).max(30),
});

export async function saveFormAction(eventId: string, _: FormState, form: FormData): Promise<FormState> {
  await getOwnedEvent(eventId);
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("fields") ?? "[]"));
  } catch {
    return { error: "Couldn't read the form." };
  }
  const parsed = z.array(fieldSchema).max(25).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the questions." };
  const fields: FormField[] = parsed.data.map((f) => ({ ...f, options: f.type === "select" ? f.options : [] }));
  if (fields.some((f) => f.type === "select" && f.options.length < 2)) {
    return { error: "Choice questions need at least two options." };
  }
  await db.update(events).set({ form: fields }).where(eq(events.id, eventId));
  refresh(eventId);
  return { ok: true, values: { fields: String(form.get("fields")) } };
}

// ── Door staff ──────────────────────────────────────────────────────────────

export async function addStaffAction(eventId: string, _: FormState, form: FormData): Promise<FormState> {
  const { user, event } = await getOwnedEvent(eventId);
  const parsed = z.email().safeParse(normalizeEmail(String(form.get("email") ?? "")));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const email = parsed.data;
  if (email === user.email) return { error: "You already have full access as the organizer." };

  const [added] = await db.insert(eventStaff).values({ eventId, email }).onConflictDoNothing().returning();
  if (added && !isDemoEmail(user.email)) {
    await sendEmail({
      to: email,
      subject: `You're on the door team for ${event.title}`,
      text: `${user.email} added you to the door team for ${event.title}.\n\nSign in with this email address to open the scanner:\n${appUrl(`/sign-in?next=/scan/${eventId}`)}`,
    });
  }
  refresh(eventId);
  return { ok: true, values: { email } };
}

export async function removeStaffAction(eventId: string, email: string) {
  await getOwnedEvent(eventId);
  await db.delete(eventStaff).where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.email, email)));
  refresh(eventId);
}

// ── Guests ──────────────────────────────────────────────────────────────────

export async function addGuestAction(eventId: string, _: FormState, form: FormData): Promise<FormState> {
  const { user, event } = await getOwnedEvent(eventId);
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const email = z.email().safeParse(normalizeEmail(String(form.get("email") ?? "")));
  if (!name || !email.success) return { error: "Enter the guest's name and a valid email." };

  const { answers } = parseAnswers(event.form, form);
  const result = await register(eventId, { name, email: email.data, answers }, { enforceLimits: false });
  if (!result.ok) {
    return { error: result.reason === "duplicate" ? "That email is already registered." : "This event is cancelled." };
  }
  if (!isDemoEmail(user.email)) await sendTicketEmail(event, result.registration);
  refresh(eventId);
  return { ok: true, values: { email: email.data } };
}

export async function cancelRegistrationAction(eventId: string, registrationId: string) {
  await getOwnedEvent(eventId);
  await db
    .update(registrations)
    .set({ status: "cancelled" })
    .where(and(eq(registrations.eventId, eventId), eq(registrations.id, registrationId)));
  refresh(eventId);
}

export async function checkInAction(eventId: string, ticketCode: string) {
  const { user } = await getOwnedEvent(eventId);
  await checkIn(eventId, ticketCode, user.email);
  refresh(eventId);
}

export async function undoCheckInAction(eventId: string, registrationId: string) {
  await getOwnedEvent(eventId);
  await undoCheckIn(eventId, registrationId);
  refresh(eventId);
}
