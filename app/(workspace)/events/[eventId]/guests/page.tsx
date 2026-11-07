import { IconDownload } from "@tabler/icons-react";
import { and, asc, eq, ilike, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { AutoRefresh } from "@/components/client";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, Card, Input } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { getOwnedEvent } from "@/lib/events";
import { formatTime } from "@/lib/time";
import { cn, formatTicketCode } from "@/lib/utils";
import { addGuestAction, cancelRegistrationAction, checkInAction, undoCheckInAction } from "../../actions";
import { AddGuestForm } from "./add-guest-form";

const { registrations } = schema;

const FILTERS = {
  all: "All",
  arrived: "Arrived",
  expected: "Expected",
  cancelled: "Cancelled",
} as const;
type Filter = keyof typeof FILTERS;

export const metadata = { title: "Guests" };

export default async function GuestsPage({ params, searchParams }: PageProps<"/events/[eventId]/guests">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter: Filter = typeof sp.filter === "string" && sp.filter in FILTERS ? (sp.filter as Filter) : "all";

  const conditions: (SQL | undefined)[] = [eq(registrations.eventId, event.id)];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(ilike(registrations.name, pattern), ilike(registrations.email, pattern), ilike(registrations.ticketCode, pattern.replace(/-/g, ""))),
    );
  }
  if (filter === "arrived") conditions.push(eq(registrations.status, "registered"), isNotNull(registrations.checkedInAt));
  if (filter === "expected") conditions.push(eq(registrations.status, "registered"), isNull(registrations.checkedInAt));
  if (filter === "cancelled") conditions.push(eq(registrations.status, "cancelled"));

  const guests = await db.query.registrations.findMany({
    where: and(...conditions),
    orderBy: asc(registrations.name),
    limit: 1000,
  });
  const questionLabels = new Map(event.form.map((f) => [f.id, f.label]));
  const canAct = event.status !== "cancelled";

  return (
    <div className="grid grid-cols-1 gap-6">
      {event.status === "published" && <AutoRefresh seconds={20} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex min-w-0 flex-1 gap-2" role="search">
          <input type="hidden" name="filter" value={filter} />
          <Input name="q" defaultValue={q} placeholder="Search name, email, or ticket code" className="max-w-sm" />
          <button className="sr-only">Search</button>
        </form>
        <div className="flex gap-2">
          <AddGuestForm addGuest={addGuestAction.bind(null, event.id)} />
          <ButtonLink href={`/events/${event.id}/guests/export`} variant="secondary" prefetch={false}>
            <IconDownload className="size-4" /> CSV
          </ButtonLink>
        </div>
      </div>

      <div className="flex gap-1">
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <Link
            key={key}
            href={{ query: { ...(q && { q }), ...(key !== "all" && { filter: key }) } }}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              filter === key ? "bg-fg text-bg" : "text-muted hover:bg-subtle",
            )}
          >
            {FILTERS[key]}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        {guests.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted">
            {q || filter !== "all" ? "No guests match." : "No one has registered yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {guests.map((guest) => {
              const answers = Object.entries(guest.answers)
                .map(([id, value]) => [questionLabels.get(id), value] as const)
                .filter(([label]) => label);
              return (
                <li key={guest.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{guest.name}</span>
                      {guest.status === "cancelled" ? (
                        <Badge tone="danger">Cancelled</Badge>
                      ) : guest.checkedInAt ? (
                        <Badge tone="success">In · {formatTime(guest.checkedInAt, event.timeZone)}</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {guest.email} ·{" "}
                      <Link href={`/t/${guest.ticketCode}`} target="_blank" className="font-mono hover:text-fg">
                        {formatTicketCode(guest.ticketCode)}
                      </Link>
                    </p>
                    {answers.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        {answers.map(([label, value]) => `${label}${/[?:]$/.test(label ?? "") ? "" : ":"} ${value}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  {canAct && guest.status === "registered" && (
                    <div className="flex gap-2">
                      {guest.checkedInAt ? (
                        <form action={undoCheckInAction.bind(null, event.id, guest.id)}>
                          <SubmitButton variant="ghost" className="h-8 px-3">
                            Undo check-in
                          </SubmitButton>
                        </form>
                      ) : (
                        <>
                          <form action={checkInAction.bind(null, event.id, guest.ticketCode)}>
                            <SubmitButton variant="secondary" className="h-8 px-3">
                              Check in
                            </SubmitButton>
                          </form>
                          <form action={cancelRegistrationAction.bind(null, event.id, guest.id)}>
                            <SubmitButton
                              variant="ghost"
                              className="h-8 px-3 text-muted"
                              confirm={`Cancel ${guest.name}'s registration? Their ticket will stop working.`}
                            >
                              Cancel
                            </SubmitButton>
                          </form>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
