import Link from "next/link";
import { Card } from "@/components/ui";
import { saveEventAction } from "../actions";
import { EventForm } from "../event-form";

export const metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/events" className="text-sm text-muted hover:text-fg">
        ← Events
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold tracking-tight">New event</h1>
      <Card className="p-6">
        <EventForm action={saveEventAction.bind(null, null)} submitLabel="Create event" />
      </Card>
      <p className="mt-4 text-sm text-muted">
        New events start as drafts. Customize the registration form, then publish to open sign-ups.
      </p>
    </div>
  );
}
