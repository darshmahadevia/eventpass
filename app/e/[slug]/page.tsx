import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  EventPublicDetails,
  type RegistrationPhase,
} from "@/features/events/event-public-details";
import { getActiveCapacityUsage } from "@/features/events/server/capacity-ledger";
import { getPublishedEvent } from "@/features/events/server/get-event";
import { db } from "@/lib/db";
import { AttendeeRegistrationForm } from "@/features/registration/attendee-registration-form";
import { getPublicRegistrationForm } from "@/features/registration/server/get-public-registration-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);

  return event
    ? { title: event.name, description: event.description }
    : { title: "Event not found" };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);

  if (!event) {
    notFound();
  }

  const fields = await getPublicRegistrationForm(event.id);
  const now = new Date();
  const phase: RegistrationPhase =
    event.status === "canceled"
      ? "canceled"
      : event.suspended
        ? "unavailable"
        : now >= event.endsAt
          ? "over"
          : now < event.registrationOpensAt
            ? "not-open"
            : now >= event.registrationClosesAt
              ? "closed"
              : "open";

  const usage = await getActiveCapacityUsage(db, event.id, now);

  return (
    <EventPublicDetails
      event={event}
      phase={phase}
      full={usage.claimed >= event.capacity}
      registration={
        phase === "open" ? (
          <AttendeeRegistrationForm slug={slug} fields={fields} />
        ) : null
      }
    />
  );
}
