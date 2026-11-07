import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IconAlertTriangle, IconClock, IconMailCheck } from "@tabler/icons-react";

import { EventPassMark } from "@/components/eventpass-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import { SentToAddress } from "@/features/registration/sent-to-address";
import { getPublishedEvent } from "@/features/events/server/get-event";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};

export default async function RegistrationCheckEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const event = await getPublishedEvent(slug);
  const outcome =
    typeof query.outcome === "string" &&
    ["hold", "waitlist", "neutral"].includes(query.outcome)
      ? query.outcome
      : null;
  if (!event || !outcome) {
    notFound();
  }

  const isNeutral = outcome === "neutral";
  const hasCapacityHold = outcome === "hold";
  const deliveryFailed = !isNeutral && query.delivery === "failed";

  return (
    <div className="flex min-h-svh flex-col bg-muted/50 dark:bg-background">
      <header>
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center px-4 sm:px-6">
          <EventPassMark />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 pb-16 sm:px-6">
        <section className="w-full panel p-6 sm:p-10">
          <IconMailCheck aria-hidden="true" className="size-10" />
          <p className="mt-6 text-sm font-medium text-muted-foreground">
            {event.name}
          </p>
          <h1 className="mt-2 type-answer">
            Check your email
          </h1>
          <SentToAddress />
          <p className="mt-4 max-w-xl text-reading text-muted-foreground">
            {isNeutral
              ? "If that address can register or already has a ticket, an email is on its way."
              : "Open the link we sent to confirm your email and get your ticket."}
          </p>

          {isNeutral ? (
            <Alert className="mt-8">
              <IconClock aria-hidden="true" />
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>
                Next steps are in the email. Check your spam folder if nothing
                arrives in a minute.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mt-8">
              <IconClock aria-hidden="true" />
              <AlertTitle>
                {hasCapacityHold
                  ? "Your place is held for 15 minutes"
                  : "No place is being held"}
              </AlertTitle>
              <AlertDescription>
                {hasCapacityHold
                  ? "Open the link before then to keep it. You are not confirmed until you do."
                  : "The event is full. Confirm your email to join the waitlist. Your place in line starts when you do."}
              </AlertDescription>
            </Alert>
          )}

          {deliveryFailed ? (
            <Alert variant="destructive" className="mt-4">
              <IconAlertTriangle aria-hidden="true" />
              <AlertTitle>We could not send your email</AlertTitle>
              <AlertDescription>
                Your details are saved, but the email did not go out. Go back
                to the event and enter your email again in a few minutes.
              </AlertDescription>
            </Alert>
          ) : null}

          <PendingLink
            href={`/e/${slug}`}
            className={cn(buttonVariants({ variant: "outline" }), "mt-8 h-auto min-h-10 py-2 whitespace-normal")}
            pendingLabel="Opening event"
          >
            Wrong email, or nothing arrived? Go back
          </PendingLink>
        </section>
      </main>
    </div>
  );
}
