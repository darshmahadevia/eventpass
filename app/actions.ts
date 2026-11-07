"use server";

import { redirect } from "next/navigation";
import { startDemo } from "@/lib/demo";

export async function startDemoAction() {
  const eventId = await startDemo();
  redirect(`/events/${eventId}`);
}
