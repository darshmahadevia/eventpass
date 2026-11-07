import { asc, eq } from "drizzle-orm";
import { SubmitButton } from "@/components/submit-button";
import { Card } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { getOwnedEvent } from "@/lib/events";
import { utcToZoned } from "@/lib/time";
import { deleteEventAction, removeStaffAction, saveEventAction, setStatusAction } from "../../actions";
import { EventForm } from "../../event-form";
import { AddStaffForm } from "./add-staff-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/events/[eventId]/settings">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  const staff = await db.query.eventStaff.findMany({
    where: eq(schema.eventStaff.eventId, event.id),
    orderBy: asc(schema.eventStaff.email),
  });

  return (
    <div className="mx-auto grid max-w-2xl gap-10">
      <Section title="Event details">
        <Card className="p-6">
          <EventForm
            action={saveEventAction.bind(null, event.id)}
            submitLabel="Save changes"
            initial={{
              title: event.title,
              description: event.description,
              location: event.location,
              startsAt: utcToZoned(event.startsAt, event.timeZone),
              endsAt: utcToZoned(event.endsAt, event.timeZone),
              timeZone: event.timeZone,
              capacity: event.capacity?.toString() ?? "",
            }}
          />
        </Card>
      </Section>

      <Section
        title="Door team"
        description="People you add can sign in with their email and open the scanner for this event. They can't see or change anything else."
      >
        <Card className="divide-y divide-border">
          {staff.map((member) => (
            <div key={member.email} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="truncate text-sm">{member.email}</span>
              <form action={removeStaffAction.bind(null, event.id, member.email)}>
                <SubmitButton variant="ghost" className="h-8 px-3 text-muted">
                  Remove
                </SubmitButton>
              </form>
            </div>
          ))}
          <div className="p-5">
            <AddStaffForm eventId={event.id} />
          </div>
        </Card>
      </Section>

      <Section title="Danger zone">
        <Card className="divide-y divide-border">
          {event.status !== "cancelled" && (
            <DangerRow
              title="Cancel event"
              body="Closes registration, stops tickets from admitting guests, and emails every registered guest."
            >
              <form action={setStatusAction.bind(null, event.id, "cancelled")}>
                <SubmitButton variant="danger" confirm="Cancel this event and notify every guest? This can't be undone.">
                  Cancel event
                </SubmitButton>
              </form>
            </DangerRow>
          )}
          <DangerRow title="Delete event" body="Permanently removes the event, its guest list, and all check-ins.">
            <form action={deleteEventAction.bind(null, event.id)}>
              <SubmitButton variant="danger" confirm="Delete this event and its entire guest list? This can't be undone.">
                Delete event
              </SubmitButton>
            </form>
          </DangerRow>
        </Card>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DangerRow({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="max-w-sm">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">{body}</p>
      </div>
      {children}
    </div>
  );
}
