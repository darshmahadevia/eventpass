import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { getScannerEvent } from "@/features/admission/server/scanner";
import { getOrganizerEvent } from "@/features/events/server/get-event";
import { EventSuspendedError } from "@/features/events/server/event-suspension";
import { reconcileOrganizerWaitlist } from "@/features/tickets/server/tickets";
import { getActiveStaffSession } from "@/lib/staff-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { EventSidebar } from "./event-sidebar";

// Every section of the event workspace shares this shell, so the event's
// identity and the way back are structural rather than something each page
// remembers to render. Before this existed the nav was copy-pasted into five
// pages and missing from three, and `edit` — reachable from the Settings tab —
// had neither nav nor a back link, leaving no way out but the browser button.
//
// The shell is a rail rather than a stack of header bands: the back-link, the
// section nav, and the event title used to occupy three rows above every page,
// under the global header, for four bands of chrome before any content. The
// rail carries all of that and hands the content column its width back, which
// the registrations and Audit tables needed most.
function isDoorOpen(event: {
  status: string;
  suspended: boolean;
  checkInOpensAt: Date;
  checkInClosesAt: Date;
}) {
  const now = new Date();
  return (
    event.status === "published" &&
    !event.suspended &&
    event.checkInOpensAt <= now &&
    now <= event.checkInClosesAt
  );
}

export default async function EventWorkspaceSectionsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const staffSession = await getActiveStaffSession();
  if (!staffSession) redirect("/sign-in");

  const event = await getOrganizerEvent(eventId, staffSession.user.id);
  if (!event) {
    // A volunteer has no workspace, only a door. A link to the event sends them
    // there rather than to a 404 that reads as if the event had vanished.
    const scannerEvent = await getScannerEvent(eventId, staffSession.user.id);
    if (scannerEvent) redirect(`/scanner/${eventId}`);
    notFound();
  }

  // Expiry-on-read (ADR 0005) has to run on organizer traffic, not only on
  // attendee mutations. The roster Expired filter is a status check, so a
  // lapsed Capacity Hold stays Unconfirmed until something expires it. Live
  // metrics polling is read-only on purpose — a five-second poll must not
  // lock the Event and send offer emails — so this shell is the dashboard
  // touch.
  if (event.status === "published" && !event.suspended) {
    try {
      await reconcileOrganizerWaitlist(event.id, staffSession.user.id);
    } catch (error) {
      if (!(error instanceof EventSuspendedError)) throw error;
    }
  }

  const isDraft = event.status === "draft";
  const isCanceled = event.status === "canceled";
  const doorsOpen = isDoorOpen(event);
  const now = new Date();
  const ended = event.status === "published" && event.endsAt < now;
  // Past this point there is nothing left to scan. A phone with scans still
  // waiting to sync reaches the scanner from the Check-in page.
  const doorClosed = event.checkInClosesAt < now;

  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <EventSidebar
        eventId={event.id}
        eventName={event.name}
        eventSlug={event.slug}
        statusLabel={
          isDraft
            ? "Draft"
            : isCanceled
              ? "Canceled"
              : doorsOpen
                ? "Doors open"
                : ended
                  ? "Ended"
                  : "Published"
        }
        statusVariant={
          isDraft
            ? "secondary"
            : isCanceled
              ? "destructive"
              : doorsOpen
                ? "success"
                : ended
                  ? "secondary"
                  : "default"
        }
        showScanner={event.status === "published" && !doorClosed}
        showPublicPage={!isDraft}
      />

      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 px-4 pt-6 pb-28 sm:gap-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-10">
        {event.suspended ? (
          <Alert variant="warning">
            <AlertTitle>Event currently unavailable</AlertTitle>
            <AlertDescription>
              Event changes and new admission activity are temporarily paused.
              Read-only history, Registrations, Check-ins, metrics, and exports
              remain available.
            </AlertDescription>
          </Alert>
        ) : null}
        {children}
      </main>
    </div>
  );
}
