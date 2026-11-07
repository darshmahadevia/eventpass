import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { IconArrowLeft, IconEye } from "@tabler/icons-react";

import { PendingLink } from "@/components/pending-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EventPublicDetails } from "@/features/events/event-public-details";
import { getOrganizerEvent } from "@/features/events/server/get-event";
import { getActiveStaffSession } from "@/lib/staff-session";

export const metadata: Metadata = { title: "Preview" };

// A draft's real address is a 404 until it is published, on purpose. This is
// the same page, for the people who are allowed to see it early.
export default async function EventPreviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getActiveStaffSession();
  if (!session) redirect("/sign-in");
  const event = await getOrganizerEvent(eventId, session.user.id);
  if (!event) notFound();

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
        <Alert>
          <IconEye aria-hidden="true" />
          <AlertTitle>This is what guests will see</AlertTitle>
          <AlertDescription>
            Nobody else can see this page until you publish.
            <PendingLink
              href={`/events/${event.id}`}
              className="mt-1 flex min-h-11 w-fit items-center gap-1.5 font-semibold text-foreground underline underline-offset-4 md:min-h-6"
              pendingLabel="Opening"
            >
              <IconArrowLeft aria-hidden="true" className="size-4" />
              Back to your event
            </PendingLink>
          </AlertDescription>
        </Alert>
      </div>
      <EventPublicDetails
        event={event}
        phase="open"
        preview
        registration={
          <p className="text-support text-muted-foreground">
            Guests fill in your registration form here.
          </p>
        }
      />
    </>
  );
}
