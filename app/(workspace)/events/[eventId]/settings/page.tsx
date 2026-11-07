import { asc, eq } from "drizzle-orm";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, Card } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { getOwnedEvent } from "@/lib/events";
import { utcToZoned } from "@/lib/time";
import { addStaffAction, deleteEventAction, removeStaffAction, saveEventAction, setStatusAction } from "../../actions";
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
    <div className="grid gap-16">
      <Section title="Event details" description="Changes show up on the registration page and on tickets right away.">
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
      </Section>

      <Section
        title="Door team"
        description="Volunteers sign in with their email and see only the scanner for this event."
      >
        <Card className="overflow-hidden">
          {staff.length > 0 && (
            <ul className="divide-y divide-line border-b border-line">
              {staff.map((member) => (
                <li key={member.email} className="flex items-center gap-3 py-3 pr-3 pl-4">
                  <Avatar name={member.email} />
                  <span className="min-w-0 flex-1 truncate">{member.email}</span>
                  <form action={removeStaffAction.bind(null, event.id, member.email)}>
                    <SubmitButton variant="ghost" size="sm" className="text-muted hover:text-danger" pendingText="Removing…">
                      Remove
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <div className="p-4">
            <AddStaffForm addStaff={addStaffAction.bind(null, event.id)} />
          </div>
        </Card>
      </Section>

      <Section title="Danger zone" description="These can't be undone.">
        <div className="divide-y divide-danger/25 rounded-2xl border border-danger/35">
          {event.status !== "cancelled" && (
            <DangerRow
              title="Cancel event"
              body="Closes registration, stops every ticket from admitting anyone, and emails each registered guest."
            >
              <form action={setStatusAction.bind(null, event.id, "cancelled")}>
                <SubmitButton
                  variant="danger"
                  confirmTitle="Cancel this event?"
                  confirm="Every registered guest gets an email, and their tickets stop working. This can't be undone."
                  confirmLabel="Cancel event"
                >
                  Cancel event
                </SubmitButton>
              </form>
            </DangerRow>
          )}
          <DangerRow title="Delete event" body="Permanently removes the event, its guest list, and every check-in.">
            <form action={deleteEventAction.bind(null, event.id)}>
              <SubmitButton
                variant="danger"
                confirmTitle="Delete this event?"
                confirm="The event, its guest list, and all check-ins are removed for good."
                confirmLabel="Delete event"
              >
                Delete event
              </SubmitButton>
            </form>
          </DangerRow>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-16 gap-y-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-pretty text-muted">{description}</p>}
      </div>
      <div className="max-w-2xl">{children}</div>
    </section>
  );
}

function DangerRow({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="max-w-sm">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{body}</p>
      </div>
      {children}
    </div>
  );
}
