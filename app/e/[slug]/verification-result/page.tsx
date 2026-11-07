import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IconAlertTriangle, IconClockX, IconMailCheck } from "@tabler/icons-react";

import { EventPassMark } from "@/components/eventpass-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import { getPublishedEvent } from "@/features/events/server/get-event";
import { cn } from "@/lib/utils";

const outcomes = {
  waitlisted: {
    icon: IconMailCheck,
    title: "You are on the waitlist",
    description:
      "Your email is verified and your place in line is held. If a place opens up we will email you an offer with a deadline.",
    success: true,
  },
  offered: {
    icon: IconMailCheck,
    title: "A place is available",
    description:
      "A place opened up while you were verifying. Check your email for the offer and its claim link.",
    success: true,
  },
  expired: {
    icon: IconClockX,
    title: "Verification link expired",
    description:
      "The 15-minute hold has ended, so this registration was not confirmed. Return to the event to register again.",
    success: false,
  },
  consumed: {
    icon: IconMailCheck,
    title: "You are all set",
    description:
      "Your ticket is in your email. Can't find it? Go back to the event page and choose Get your ticket again.",
    success: true,
  },
  invalid: {
    icon: IconAlertTriangle,
    title: "Verification link is not valid",
    description:
      "The link may be incomplete or altered. Open the original email and try again, or return to the event.",
    success: false,
  },
  mismatched: {
    icon: IconAlertTriangle,
    title: "Verification link does not match",
    description:
      "This link cannot confirm a place for this event. Open the original email and use its complete link.",
    success: false,
  },
  canceled: {
    icon: IconAlertTriangle,
    title: "Event canceled",
    description:
      "This event was canceled, so the registration cannot be confirmed and no ticket can be issued.",
    success: false,
  },
  unavailable: {
    icon: IconAlertTriangle,
    title: "Event currently unavailable",
    description:
      "This event is paused, so your registration could not be confirmed. No ticket was issued.",
    success: false,
  },
} as const;

export const metadata: Metadata = {
  title: "Email confirmation",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function VerificationResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const event = await getPublishedEvent(slug);
  const outcome = typeof query.outcome === "string" ? query.outcome : "";
  if (!event || !(outcome in outcomes)) notFound();

  const deliveryFailed = query.delivery === "failed" && outcome === "waitlisted";
  const content = event.suspended
    ? outcomes.unavailable
    : outcomes[outcome as keyof typeof outcomes];
  const description = deliveryFailed
    ? `${content.description} The waitlist email could not be sent. Your place is still held.`
    : content.description;
  const Icon = content.icon;
  return (
    <div className="flex min-h-svh flex-col bg-muted/50 dark:bg-background">
      <header>
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center px-4 sm:px-6">
          <EventPassMark />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 pb-16 sm:px-6">
        <section className="w-full panel p-6 sm:p-10">
          <p className="text-sm font-medium text-muted-foreground">{event.name}</p>
          <h1 className="mt-2 type-answer">
            {outcome === "consumed"
              ? "You are already confirmed"
              : content.success
                ? "Registration verified"
                : "Registration not confirmed"}
          </h1>
          <Alert variant={content.success ? "default" : "destructive"} className="mt-8">
            <Icon aria-hidden="true" />
            <AlertTitle>{content.title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </Alert>
          <PendingLink
            href={`/e/${slug}`}
            className={cn(buttonVariants(), "mt-8")}
            pendingLabel="Opening event"
          >
            Return to event
          </PendingLink>
        </section>
      </main>
    </div>
  );
}
