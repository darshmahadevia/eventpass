"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { parseAnswers, register, sendTicketEmail } from "@/lib/events";

export type RegisterState = {
  error?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  sentTo?: string;
};

const CLOSED_MESSAGES = {
  draft: "Registration isn't open yet.",
  cancelled: "This event has been cancelled.",
  ended: "This event has already ended.",
  full: "Sorry, the event just filled up.",
} as const;

export async function registerAction(slug: string, _: RegisterState, form: FormData): Promise<RegisterState> {
  const event = await db.query.events.findFirst({ where: eq(schema.events.slug, slug) });
  if (!event) return { error: "This event no longer exists." };

  const values = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === "string") as [string, string][],
  );
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const email = z.email().safeParse(normalizeEmail(String(form.get("email") ?? "")));
  const { answers, errors } = parseAnswers(event.form, form);
  if (!name) errors.name = "Enter your name.";
  if (!email.success) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length || !email.success) return { errors, values };

  const result = await register(event.id, { name, email: email.data, answers }, { enforceLimits: true });
  if (!result.ok) {
    if (result.reason === "duplicate" && result.existing) {
      // Don't reveal the existing ticket to whoever typed the address; mail it to the owner.
      await sendTicketEmail(event, result.existing);
      return { sentTo: email.data };
    }
    return { error: CLOSED_MESSAGES[result.reason as keyof typeof CLOSED_MESSAGES], values };
  }

  await sendTicketEmail(event, result.registration);
  redirect(`/t/${result.registration.ticketCode}?new=1`);
}
