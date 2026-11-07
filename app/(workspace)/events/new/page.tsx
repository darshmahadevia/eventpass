import { BackLink, PageTitle } from "@/components/ui";
import { saveEventAction } from "../actions";
import { EventForm } from "../event-form";

export const metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/events">Events</BackLink>
      <PageTitle className="mt-4">New event</PageTitle>
      <p className="mt-3 mb-10 text-muted">
        It starts as a draft. Add your own questions to the registration form, then publish to open sign-ups.
      </p>
      <EventForm action={saveEventAction.bind(null, null)} submitLabel="Create event" />
    </div>
  );
}
