import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ScannerWorkspace } from "@/features/admission/scanner-workspace";
import { getScannerEvent } from "@/features/admission/server/scanner";
import { scannerExitPath } from "@/features/staffing/staffing-policy";
import { getActiveStaffSession } from "@/lib/staff-session";

export const metadata: Metadata = { title: "Scanner" };

// `formatRange` collapses the parts both ends share, so a door that opens and
// closes on one day reads "Jul 31, 2026, 5:03 – 14:03" rather than printing the
// same date twice. Every other schedule in the product is formatted this way.
function formatWindow(opensAt: Date, closesAt: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).formatRange(opensAt, closesAt);
}

export default async function ScannerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getActiveStaffSession();
  // Carries the door back to sign-in. A volunteer handed a scanner link opens it
  // on a phone that has never signed in, and the bare redirect landed them on
  // the events list with the queue already forming — the one page in the product
  // where "sign in, then find your way back" is the wrong instruction.
  if (!session) {
    redirect(
      `/sign-in?callbackUrl=${encodeURIComponent(`/scanner/${eventId}`)}`,
    );
  }
  const scannerEvent = await getScannerEvent(eventId, session.user.id);
  if (!scannerEvent) notFound();
  const now = new Date();

  return (
    // Dark in both themes. This is a camera tool held up in a dim corridor, and
    // the decisions it shows are brightest against it.
    <main className="dark flex min-h-svh flex-col bg-background text-foreground">
      <ScannerWorkspace
        eventId={scannerEvent.id}
        eventName={scannerEvent.name}
        exitHref={scannerExitPath(scannerEvent.role, scannerEvent.id)}
        eventStatus={scannerEvent.status}
        doorState={
          now < scannerEvent.checkInOpensAt
            ? "before"
            : now > scannerEvent.checkInClosesAt
              ? "after"
              : "open"
        }
        eventSuspended={scannerEvent.suspended}
        actorRole={scannerEvent.role}
        checkInWindow={formatWindow(
          scannerEvent.checkInOpensAt,
          scannerEvent.checkInClosesAt,
          scannerEvent.eventTimeZone,
        )}
      />
    </main>
  );
}
