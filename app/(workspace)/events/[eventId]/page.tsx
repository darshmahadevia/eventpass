import { and, desc, eq, isNotNull } from "drizzle-orm";
import { AutoRefresh, CopyButton } from "@/components/client";
import { SubmitButton } from "@/components/submit-button";
import { Card, Notice } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { closedReason, getEventStats, getOwnedEvent } from "@/lib/events";
import { formatTime } from "@/lib/time";
import { appUrl } from "@/lib/utils";
import { setStatusAction } from "../actions";

const { registrations } = schema;

export default async function EventOverviewPage({ params }: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  const stats = await getEventStats(event.id);
  const recent = await db.query.registrations.findMany({
    where: and(eq(registrations.eventId, event.id), isNotNull(registrations.checkedInAt)),
    orderBy: desc(registrations.checkedInAt),
    limit: 8,
  });

  const expected = stats.registered - stats.checkedIn;
  const arrivedPct = stats.registered ? Math.round((stats.checkedIn / stats.registered) * 100) : 0;
  const publicUrl = appUrl(`/e/${event.slug}`);
  const reason = closedReason(event, stats.registered);
  const live = event.status === "published" && event.endsAt > new Date();

  return (
    <div className="grid gap-6">
      {live && <AutoRefresh />}

      {event.status === "draft" && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-accent/40 bg-accent-soft p-5">
          <div>
            <p className="font-semibold">This event is a draft</p>
            <p className="text-sm text-muted">Guests can&apos;t register until you publish it.</p>
          </div>
          <form action={setStatusAction.bind(null, event.id, "published")}>
            <SubmitButton pendingText="Publishing…">Publish event</SubmitButton>
          </form>
        </Card>
      )}
      {event.status === "cancelled" && (
        <Notice tone="danger">This event is cancelled. Tickets no longer admit guests.</Notice>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Registered" value={stats.registered} detail={event.capacity ? `of ${event.capacity} spots` : "No capacity limit"} />
        <Stat label="Checked in" value={stats.checkedIn} detail={`${arrivedPct}% of registered`} />
        <Stat label="Still expected" value={expected} />
        <Stat label="Cancelled" value={stats.cancelled} />
      </div>

      <Card className="p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold">Arrivals</span>
          <span className="text-muted">
            {stats.checkedIn} / {stats.registered}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-subtle">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${arrivedPct}%` }} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Registration link</h2>
          <p className="mt-1 text-sm text-muted">
            {reason === null
              ? "Registration is open. Share this link with guests."
              : reason === "full"
                ? "The event is full, so the page shows that registration is closed."
                : reason === "ended"
                  ? "The event has ended."
                  : reason === "draft"
                    ? "The link starts working when you publish."
                    : "Registration is closed."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <code className="flex min-w-0 flex-1 items-center truncate rounded-lg bg-subtle px-3 text-sm">{publicUrl}</code>
            <CopyButton value={publicUrl} />
          </div>
          {event.status === "published" && (
            <form action={setStatusAction.bind(null, event.id, "draft")} className="mt-4">
              <SubmitButton variant="ghost" className="h-8 px-3 text-muted" confirm="Unpublish? The registration page will stop accepting guests.">
                Unpublish
              </SubmitButton>
            </form>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Latest arrivals</h2>
          {recent.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No one has checked in yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recent.map((guest) => (
                <li key={guest.id} className="flex justify-between py-2 text-sm">
                  <span className="font-medium">{guest.name}</span>
                  <span className="text-muted">{guest.checkedInAt && formatTime(guest.checkedInAt, event.timeZone)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </Card>
  );
}
