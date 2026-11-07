"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { acceptOwnershipTransfer, withdrawOwnershipTransfer } from "@/features/staffing/server/staffing-application";
import { getActiveStaffSession } from "@/lib/staff-session";

export async function acceptOwnershipTransferAction(
  eventId: string,
  transferId: string,
) {
  const session = await getActiveStaffSession();
  if (!session) redirect("/sign-in");
  try {
    await acceptOwnershipTransfer(transferId, session.user.id);
  } catch {
    redirect(`/events/${eventId}/staff?error=That+transfer+could+not+be+accepted.`);
  }
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/staff`);
  redirect(`/events/${eventId}/staff?notice=You+now+own+this+event.`);
}

export async function withdrawOwnershipTransferAction(
  eventId: string,
  transferId: string,
) {
  const session = await getActiveStaffSession();
  if (!session) redirect("/sign-in");
  try {
    await withdrawOwnershipTransfer(transferId, session.user.id);
  } catch {
    redirect(`/events/${eventId}/staff?error=That+transfer+could+not+be+withdrawn.`);
  }
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/staff`);
  redirect(`/events/${eventId}/staff?notice=Transfer+withdrawn.`);
}
