import type { Metadata } from "next";
import { IconArrowLeft } from "@tabler/icons-react";

import { PendingLink } from "@/components/pending-link";
import { CreateEventForm } from "@/features/events/create-event-form";
import type { CreateEventFormField } from "./actions";

export const metadata: Metadata = {
  title: "Create event",
};

export default function NewEventPage() {
  const initialValues = {
    name: "",
    description: "",
    slug: "",
    eventTimeZone: "",
    startsAtLocal: "",
    endsAtLocal: "",
    venueName: "",
    venueAddress: "",
    venueMapUrl: "",
    capacity: "",
    registrationOpensAtLocal: "",
    registrationClosesAtLocal: "",
    checkInOpensAtLocal: "",
    checkInClosesAtLocal: "",
  } satisfies Record<CreateEventFormField, string>;

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-2">
        {/* A real link, not a label stacked over the heading. It looked like a
            breadcrumb and did nothing; the event sidebar already carries this
            exact control, so this is that one. */}
        <PendingLink
          href="/events"
          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          pendingLabel="Events"
        >
          <IconArrowLeft aria-hidden="true" className="size-4" />
          Events
        </PendingLink>
        <h1 className="type-page">Create an event</h1>
        <p className="max-w-2xl text-support text-muted-foreground">
          This starts as a private draft. Guests see nothing until you publish
          it.
        </p>
      </div>
      <CreateEventForm initialValues={initialValues} />
    </main>
  );
}
