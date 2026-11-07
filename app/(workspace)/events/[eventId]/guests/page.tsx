import { IconDownload, IconSearch } from "@tabler/icons-react";
import { and, asc, eq, ilike, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { AutoRefresh } from "@/components/client";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, Badge, ButtonLink, Card, Input } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { getEventStats, getOwnedEvent } from "@/lib/events";
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
  const stats = await getEventStats(event.id);
  const counts: Record<Filter, number> = {
    all: stats.registered + stats.cancelled,
    arrived: stats.checkedIn,
    expected: stats.registered - stats.checkedIn,
    cancelled: stats.cancelled,
  };
  const questionLabels = new Map(event.form.map((f) => [f.id, f.label]));
  const canAct = event.status !== "cancelled";

  return (
    <div className="grid gap-5">
      {event.status === "published" && <AutoRefresh seconds={20} />}

      <div className="flex flex-wrap items-center gap-3">
        <form className="relative min-w-0 flex-1 basis-64" role="search">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <IconSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-faint" />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search name, email, or ticket code"
            aria-label="Search guests"
            className="pl-10 sm:max-w-md"
          />
        </form>
        <div className="flex gap-2">
          <ButtonLink href={`/events/${event.id}/guests/export`} variant="secondary" prefetch={false}>
            <IconDownload aria-hidden className="size-4" /> CSV
          </ButtonLink>
          <AddGuestForm addGuest={addGuestAction.bind(null, event.id)} />
        </div>
      </div>

      <nav aria-label="Filter guests" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <Link
            key={key}
            href={{ query: { ...(q && { q }), ...(key !== "all" && { filter: key }) } }}
            aria-current={filter === key ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
              filter === key ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {FILTERS[key]}
            <span className={cn("tabular-nums", filter === key ? "opacity-60" : "text-faint")}>{counts[key]}</span>
          </Link>
        ))}
      </nav>

      <Card className="overflow-hidden">
        {guests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">{q || filter !== "all" ? "No guests match" : "No one has registered yet"}</p>
            <p className="mt-1 text-sm text-muted">
              {q
                ? `Nothing for “${q}”. Try part of a name, an email, or a ticket code.`
                : filter !== "all"
                  ? "Try another filter."
                  : "Share the registration link, or add someone yourself."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {guests.map((guest) => {
              const answers = Object.entries(guest.answers)
                .map(([id, value]) => [questionLabels.get(id), value] as const)
                .filter(([label]) => label);
              const cancelled = guest.status === "cancelled";
              return (
                <li key={guest.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
                  <Avatar name={guest.name} tone={cancelled ? "danger" : guest.checkedInAt ? "success" : "neutral"} />
                  <div className="min-w-0 flex-1 basis-52">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className={cn("font-semibold", cancelled && "text-muted line-through decoration-1")}>{guest.name}</span>
                      {cancelled ? (
                        <Badge tone="danger">Cancelled</Badge>
                      ) : guest.checkedInAt ? (
                        <Badge tone="success">In at {formatTime(guest.checkedInAt, event.timeZone)}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {guest.email}
                      <span className="text-faint"> · </span>
                      <Link
                        href={`/t/${guest.ticketCode}`}
                        target="_blank"
                        className="font-mono text-[0.8125rem] underline-offset-4 hover:text-fg hover:underline"
                      >
                        {formatTicketCode(guest.ticketCode)}
                      </Link>
                    </p>
                    {answers.length > 0 && (
                      <dl className="mt-2 flex flex-wrap gap-1.5">
                        {answers.map(([label, value]) => (
                          <div key={label} className="inline-flex max-w-full gap-1 rounded-md bg-raised px-2 py-0.5 text-xs">
                            <dt className="shrink-0 text-muted">{label?.replace(/[?:]$/, "")}:</dt>
                            <dd className="truncate font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                  {canAct && !cancelled && (
                    <div className="ml-14 flex gap-1.5 sm:ml-0">
                      {guest.checkedInAt ? (
                        <form action={undoCheckInAction.bind(null, event.id, guest.id)}>
                          <SubmitButton variant="ghost" size="sm" className="text-muted hover:text-fg">
                            Undo check-in
                          </SubmitButton>
                        </form>
                      ) : (
                        <>
                          <form action={checkInAction.bind(null, event.id, guest.ticketCode)}>
                            <SubmitButton variant="secondary" size="sm">
                              Check in
                            </SubmitButton>
                          </form>
                          <form action={cancelRegistrationAction.bind(null, event.id, guest.id)}>
                            <SubmitButton
                              variant="ghost"
                              size="sm"
                              className="text-muted hover:text-danger"
                              confirmTitle="Cancel registration?"
                              confirm={`${guest.name}'s ticket will stop working, and their spot opens up.`}
                              confirmLabel="Cancel registration"
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
