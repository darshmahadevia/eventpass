"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTicket } from "@/lib/tickets";

/** Lets a guest give up their spot. Holding the ticket code is the authorization. */
export async function cancelTicketAction(code: string) {
  const ticket = await getTicket(code);
  if (!ticket) return;
  await db
    .update(schema.registrations)
    .set({ status: "cancelled" })
    .where(and(eq(schema.registrations.id, ticket.registration.id), isNull(schema.registrations.checkedInAt)));
  revalidatePath(`/t/${code}`);
}
