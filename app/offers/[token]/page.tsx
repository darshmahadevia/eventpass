import type { Metadata } from "next";
import { IconClock, IconTicket } from "@tabler/icons-react";

import { EventPassMark } from "@/components/eventpass-mark";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PendingLink } from "@/components/pending-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getAdmissionOfferView } from "@/features/tickets/server/tickets";
import { formatAdmissionOfferDeadline } from "@/lib/email/send-admission-offer";
import { cn } from "@/lib/utils";

import { claimAdmissionOfferAction } from "./actions";

export const metadata: Metadata = {
  title: "Admission offer",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function AdmissionOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const offer = await getAdmissionOfferView(token);
  const outcome = typeof query.outcome === "string" ? query.outcome : "";

  return (
    <div className="flex min-h-svh flex-col bg-muted/50 dark:bg-background">
      <header>
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center px-4 sm:px-6">
          <EventPassMark />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 pb-16 sm:px-6">
        <section className="w-full panel p-6 sm:p-10">
          {offer && !offer.suspended ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">{offer.eventName}</p>
              <h1 className="mt-2 type-answer">
                A place is ready for you
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                {offer.attendeeName}, you reached the front of the waitlist. Claim
                your place and your ticket appears right away.
              </p>
              <Alert className="mt-8">
                <IconClock aria-hidden="true" />
                <AlertTitle>Claim it in time</AlertTitle>
                <AlertDescription>
                  Claim by {formatAdmissionOfferDeadline(offer.expiresAt, offer.eventTimeZone)},
                  or the place goes to the next person waiting.
                </AlertDescription>
              </Alert>
              <form action={claimAdmissionOfferAction.bind(null, token)} className="mt-8">
                <FormSubmitButton
                  size="lg"
                  pendingLabel="Claiming your place"
                >
                  <IconTicket aria-hidden="true" />
                  Claim my place
                </FormSubmitButton>
              </form>
            </>
          ) : offer?.suspended || outcome === "unavailable" ? (
            <>
              <h1 className="type-answer">
                Event currently unavailable
              </h1>
              <p className="mt-4 text-muted-foreground">
                This offer cannot be claimed right now because the event is
                paused.
              </p>
            </>
          ) : (
            <>
              <h1 className="type-answer">
                {outcome === "consumed"
                  ? "Offer already claimed"
                  : outcome === "canceled"
                    ? "Event canceled"
                    : "This offer has expired"}
              </h1>
              <p className="mt-4 text-muted-foreground">
                {outcome === "consumed"
                  ? "This link has already been used. Your ticket is in the email we sent after you claimed."
                  : outcome === "canceled"
                    ? "This event was canceled, so the offer cannot be claimed and no ticket can be issued."
                    : "The deadline passed, so the place may have gone to the next person waiting."}
              </p>
            </>
          )}
          <PendingLink
            href={offer ? `/e/${offer.eventSlug}` : "/"}
            className={cn(buttonVariants({ variant: "outline" }), "mt-8")}
            pendingLabel="Opening event"
            referrerPolicy="no-referrer"
          >
            {offer ? "Return to event" : "Go to EventPass"}
          </PendingLink>
        </section>
      </main>
    </div>
  );
}
