import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconClockExclamation,
  IconMailForward,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ManageGuest } from "@/features/registration/manage-guest";
import { formatTicketCode } from "@/features/tickets/ticket-code";
import type { RosterStatusKey } from "@/features/registration/roster-status";
import {
  ROSTER_PAGE_SIZE,
  type EventRoster,
} from "@/features/registration/server/get-event-roster";

/**
 * Every status carries its own icon as well as its label, so an outcome is never
 * conveyed by colour alone.
 */
const STATUS_ICONS: Record<RosterStatusKey, Icon> = {
  checked_in: IconUserCheck,
  confirmed: IconCircleCheck,
  offer_sent: IconMailForward,
  waitlisted: IconUsers,
  unconfirmed: IconClock,
  expired: IconClockExclamation,
  canceled: IconAlertTriangle,
};

const BADGE_VARIANTS = {
  primary: "default",
  muted: "secondary",
  outline: "outline",
  destructive: "destructive",
} as const;

function formatMoment(value: Date, timeZone: string) {
  // Components spelled out rather than `dateStyle`/`timeStyle`, which cannot be
  // combined with `timeZoneName`.
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(value);
}

function formatDay(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(value);
}

export function RosterTable({
  roster,
  eventId,
  eventTimeZone,
  /**
   * Built by the page, which owns the current search params — so paging keeps
   * the active search and filter instead of silently resetting them.
   */
  nextHref,
  hasActiveSearch,
}: {
  roster: EventRoster;
  eventId: string;
  eventTimeZone: string;
  nextHref: string | null;
  hasActiveSearch: boolean;
}) {
  if (roster.rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <RosterCount roster={roster} />
        <Empty className="panel">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconUsers aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              {hasActiveSearch
                ? "Nobody matches"
                : "No guests yet"}
            </EmptyTitle>
            <EmptyDescription>
              {hasActiveSearch
                ? "Try a shorter search or a different status."
                : "Guests appear here as they register. You can also add one yourself, or import a list below."}
            </EmptyDescription>
          </EmptyHeader>
          {!hasActiveSearch ? (
            <EmptyContent>
              <a href="#import-guests" className={buttonVariants({ variant: "outline" })}>Import guests from CSV</a>
            </EmptyContent>
          ) : null}
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RosterCount roster={roster} />

      <div className="overflow-hidden panel">
        <Table>
          <TableHeader className="bg-muted/50 text-xs text-muted-foreground">
            <TableRow>
              <TableHead scope="col">Guest</TableHead>
              <TableHead scope="col" className="hidden sm:table-cell">Status</TableHead>
              <TableHead scope="col" className="hidden md:table-cell">Ticket</TableHead>
              <TableHead scope="col" className="hidden md:table-cell">Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.rows.map((row) => {
              const hasDetail = row.answers.length > 0;

              return (
                <TableRow key={row.registrationId} className="align-top">
                  <TableCell className="whitespace-normal">
                    <div className="font-semibold wrap-anywhere text-foreground">
                      {row.attendeeName}
                    </div>
                    <div className="text-xs wrap-anywhere text-muted-foreground">
                      {row.email}
                    </div>
                    {/* On a phone the status lives here, so the address gets
                        the full width instead of breaking mid-domain. */}
                    <div className="mt-1.5 sm:hidden">
                      <RosterStatus row={row} eventId={eventId} eventTimeZone={eventTimeZone} />
                    </div>
                    {row.ticketCode ? (
                      <div className="mt-1 font-mono text-xs text-muted-foreground md:hidden">
                        {formatTicketCode(row.ticketCode)}
                      </div>
                    ) : null}
                    {row.source === "imported" ? (
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        Imported
                      </Badge>
                    ) : null}
                    {hasDetail ? (
                      <details className="mt-2 text-xs">
                        <summary className="flex min-h-6 w-fit cursor-pointer items-center rounded text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                          {row.answers.length} answer
                          {row.answers.length === 1 ? "" : "s"}
                        </summary>
                        <dl className="mt-2 flex flex-col gap-2 border-l pl-3">
                          {row.answers.map((answer) => (
                            <div key={answer.fieldId}>
                              <dt className="font-medium text-foreground">
                                {answer.label}
                                {answer.archived ? (
                                  <span className="ml-1.5 font-normal text-muted-foreground">
                                    (archived)
                                  </span>
                                ) : null}
                              </dt>
                              <dd className="whitespace-pre-wrap text-muted-foreground">
                                {answer.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    ) : null}
                  </TableCell>

                  <TableCell className="hidden whitespace-normal sm:table-cell">
                    <RosterStatus row={row} eventId={eventId} eventTimeZone={eventTimeZone} />
                  </TableCell>

                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {row.ticketCode ? (
                      formatTicketCode(row.ticketCode)
                    ) : (
                      <span className="font-sans text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {formatDay(row.registeredAt, eventTimeZone)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {nextHref ? (
        <div className="flex justify-center">
          <PendingLink
            href={nextHref}
            className={buttonVariants({ variant: "outline" })}
            prefetch={false}
            pendingLabel="Loading more"
          >
            Show {ROSTER_PAGE_SIZE} more
          </PendingLink>
        </div>
      ) : null}
    </div>
  );
}

function RosterStatus({
  row,
  eventId,
  eventTimeZone,
}: {
  row: EventRoster["rows"][number];
  eventId: string;
  eventTimeZone: string;
}) {
  const StatusIcon = STATUS_ICONS[row.status.key];
  return (
    <>
      <Badge variant={BADGE_VARIANTS[row.status.emphasis]} className="gap-1.5">
        <StatusIcon aria-hidden="true" className="size-3.5" />
        {row.status.label}
      </Badge>
      {row.status.qualifier ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {row.status.qualifier}
        </p>
      ) : null}
      {row.status.deadline ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {row.status.deadline.kind === "capacity_hold"
            ? "Place held until"
            : "Offer open until"}{" "}
          {formatMoment(row.status.deadline.at, eventTimeZone)}
        </p>
      ) : null}
      {row.checkedInAt ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {formatMoment(row.checkedInAt, eventTimeZone)}
        </p>
      ) : null}
      {["confirmed", "checked_in", "unconfirmed", "waitlisted"].includes(
        row.status.key,
      ) ? (
        <div>
          <ManageGuest
            eventId={eventId}
            registrationId={row.registrationId}
            name={row.attendeeName}
            email={row.email}
            ticketCode={row.ticketCode}
            canAdmit={row.status.key === "confirmed" && Boolean(row.ticketCode)}
          />
        </div>
      ) : null}
    </>
  );
}

function RosterCount({ roster }: { roster: EventRoster }) {
  const isFiltered = roster.matchingCount !== roster.totalCount;

  return (
    <p
      className="text-sm text-muted-foreground"
      // Announced so a keyboard or screen-reader user learns the result count
      // changed without having to hunt for it after each search.
      role="status"
      aria-live="polite"
    >
      {isFiltered
        ? `${roster.matchingCount.toLocaleString()} of ${roster.totalCount.toLocaleString()} guests match`
        : `${roster.totalCount.toLocaleString()} guest${roster.totalCount === 1 ? "" : "s"}`}
    </p>
  );
}
