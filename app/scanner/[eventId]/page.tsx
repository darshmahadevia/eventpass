import { notFound, redirect } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";

import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import { ScannerWorkspace } from "@/features/admission/scanner-workspace";
import { getScannerEvent } from "@/features/admission/server/scanner";
import { scannerExitPath } from "@/features/staffing/staffing-policy";
import { getActiveStaffSession } from "@/lib/staff-session";

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

  return (
    // Dark in both themes. This is a camera tool held up in a dim corridor, and
    // the decisions it shows are brightest against it.
    <main className="dark flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex min-h-16 w-full max-w-2xl items-center gap-2 px-2 py-2 sm:px-4">
          <PendingLink
            href={scannerExitPath(scannerEvent.role, scannerEvent.id)}
            className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
            aria-label={`Back to ${scannerEvent.name}`}
            pendingLabel=""
          >
            <IconArrowLeft />
          </PendingLink>
          <p className="min-w-0 flex-1 truncate font-headline">
            {scannerEvent.name}
          </p>
        </div>
      </header>
      <ScannerWorkspace
        eventId={scannerEvent.id}
        eventStatus={scannerEvent.status}
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
