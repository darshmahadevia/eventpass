"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AdmissionResult } from "@/features/admission/server/admission-application";
import { admitOnline } from "@/features/admission/server/admission";
import {
  correctGuest,
  recordGuestCanceled,
} from "@/features/registration/server/guest-corrections";
import {
  cancelGuestRegistration,
  resendGuestTicket,
} from "@/features/tickets/server/tickets";
import { getActiveStaffSession } from "@/lib/staff-session";

type GuestActionResult = { ok: boolean; message: string };

async function requireStaff() {
  const session = await getActiveStaffSession();
  if (!session) redirect("/sign-in");
  return session;
}

function refresh(eventId: string) {
  revalidatePath(`/events/${eventId}/registrations`);
}

export async function resendGuestTicketAction(
  eventId: string,
  registrationId: string,
): Promise<GuestActionResult> {
  const session = await requireStaff();
  const result = await resendGuestTicket(eventId, registrationId, session.user.id);
  if (result.outcome === "sent" && result.deliveryStatus !== "failed") {
    return { ok: true, message: "Ticket sent." };
  }
  if (result.outcome === "throttled") {
    return { ok: false, message: "A ticket was sent recently. Try again later." };
  }
  return { ok: false, message: "The ticket could not be sent. Try again." };
}

export async function updateGuestAction(
  eventId: string,
  registrationId: string,
  values: { name: string; email: string },
): Promise<GuestActionResult> {
  const session = await requireStaff();
  const result = await correctGuest(eventId, registrationId, session.user.id, values);
  if (result.outcome === "error") return { ok: false, message: result.message };
  refresh(eventId);
  if (!result.emailChanged) return { ok: true, message: "Saved." };

  const sent = await resendGuestTicket(eventId, registrationId, session.user.id);
  return {
    ok: true,
    message:
      sent.outcome === "sent" && sent.deliveryStatus !== "failed"
        ? "Saved, and the ticket went to the new address."
        : "Saved. If they have a ticket, use Resend ticket to send it there.",
  };
}

export async function cancelGuestAction(
  eventId: string,
  registrationId: string,
): Promise<GuestActionResult> {
  const session = await requireStaff();
  const result = await cancelGuestRegistration(
    eventId,
    registrationId,
    session.user.id,
  );
  if (result.outcome === "canceled") {
    await recordGuestCanceled(eventId, registrationId, session.user.id);
    refresh(eventId);
    return { ok: true, message: "Registration canceled." };
  }
  return {
    ok: false,
    message:
      result.outcome === "checked_in"
        ? "This guest is checked in. Undo that first."
        : result.outcome === "closed"
          ? "Registrations can't be canceled once check-in has opened."
          : "This registration could not be canceled.",
  };
}

export async function checkInGuestAction(
  eventId: string,
  ticketCode: string,
): Promise<AdmissionResult> {
  const session = await requireStaff();
  const result = await admitOnline({
    eventId,
    clientAttemptId: randomUUID(),
    input: ticketCode,
    inputMethod: "manual",
    actorUserId: session.user.id,
  });
  refresh(eventId);
  return result;
}
