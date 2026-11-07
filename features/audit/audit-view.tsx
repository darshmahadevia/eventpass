import { IconHistory } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
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
import { AuditFilterControls } from "@/features/audit/audit-filter-controls";
import type {
  AuditCategoryValue,
  AuditSourceValue,
} from "@/features/audit/audit-filters";
import {
  AUDIT_PAGE_SIZE,
  type EventAuditLog,
} from "@/features/audit/server/get-audit-log";
import { formatTicketCode, isTicketCode } from "@/features/tickets/ticket-code";

// The whole product writes a Ticket Code grouped, because that is how a person
// reads one aloud. The audit log printed it as ten unbroken characters.
function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatAuditTarget(value: string) {
  if (isTicketCode(value)) return formatTicketCode(value);
  // Internal references arrive as `staff_invitation:4a467a71`.
  const [, kind, id] = /^([a-z_]+):(\S+)$/.exec(value) ?? [];
  if (!kind || !id) return value;
  return `${sentenceCase(kind.replaceAll("_", " "))} ${id.slice(0, 8)}`;
}

// Stored metadata keys are field names. Written out, `normalizedEmail:
// check_in_volunteer` reads as a database row rather than a sentence.
function formatAuditDetail(key: string, value: unknown) {
  const label = key
    .replace(/^normalized/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .trim()
    .toLowerCase();
  const text =
    typeof value === "string" && /^[a-z]+(_[a-z]+)+$/.test(value)
      ? value.replaceAll("_", " ")
      : String(value);
  return `${sentenceCase(label)}: ${text}`;
}

// Seconds stay: this column is compared against the scanner to settle disputes.
// Otherwise it reads like every other date in the product.
function formatAuditTimestamp(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

export function AuditView({
  log,
  eventTimeZone,
  category,
  source,
  initialQuery,
  nextHref,
}: {
  log: EventAuditLog;
  eventTimeZone: string;
  category: AuditCategoryValue;
  source: AuditSourceValue;
  initialQuery: string;
  nextHref: string | null;
}) {
  const isFiltered = log.matchingCount !== log.totalCount;

  return (
    <div className="flex flex-col gap-6">
      {/* The page header already says what this log is. A second card repeating
          it in longer words was the only thing between the title and the
          controls someone came here to use. */}
      <AuditFilterControls
        category={category}
        source={source}
        initialQuery={initialQuery}
      />

      {/*
        The count states what was searched, not just what is shown. The previous
        implementation searched the most recent 200 Audit Entries and 300 Scan
        Attempts in the browser while appearing to search the whole log.
      */}
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {isFiltered
          ? `${log.matchingCount.toLocaleString()} of ${log.totalCount.toLocaleString()} entries match`
          : `${log.totalCount.toLocaleString()} ${log.totalCount === 1 ? "entry" : "entries"}`}
      </p>

      {log.records.length > 0 ? (
        <>
          <div className="overflow-hidden panel">
            <Table stack className="text-xs">
              <TableHeader className="bg-muted/50 text-muted-foreground">
                <TableRow>
                  <TableHead scope="col">Time</TableHead>
                  <TableHead scope="col">Who</TableHead>
                  <TableHead scope="col">Action</TableHead>
                  <TableHead scope="col">About</TableHead>
                  <TableHead scope="col">Source</TableHead>
                  <TableHead scope="col">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.records.map((record) => {
                  const date = new Date(record.createdAt);
                  const isScan = record.category === "scan";
                  const isConflictOrReversal =
                    record.action.includes("conflict") ||
                    record.action.includes("reversal");

                  return (
                    <TableRow key={record.id}>
                      <TableCell
                        data-label="Time"
                        className="text-muted-foreground tabular-nums"
                      >
                        <time dateTime={record.createdAt}>
                          {formatAuditTimestamp(date, eventTimeZone)}
                        </time>
                      </TableCell>

                      <TableCell data-label="Who" className="font-medium">
                        <div>
                        <div>{record.actorName}</div>
                        {record.actorEmail ? (
                          <div className="text-xs text-muted-foreground">
                            {record.actorEmail}
                          </div>
                        ) : null}
                        </div>
                      </TableCell>

                      <TableCell data-label="Action">
                        <Badge
                          variant={
                            isConflictOrReversal
                              ? "destructive"
                              : isScan
                                ? "secondary"
                                : "default"
                          }
                          className="text-xs font-normal"
                        >
                          {record.actionLabel}
                        </Badge>
                      </TableCell>

                      <TableCell data-label="About" className="wrap-anywhere">
                        {formatAuditTarget(record.targetLabel ?? record.targetId)}
                      </TableCell>

                      <TableCell data-label="Source">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge
                              variant={
                                record.source === "offline" ? "outline" : "secondary"
                              }
                              className="text-xs capitalize"
                            >
                              {record.source}
                            </Badge>
                            {record.timestampConfidence === "low" ? (
                              // "Low confidence clock" named the mechanism. The
                              // organizer needs the consequence: this row's time
                              // is the phone's, and the phone's may be wrong.
                              <Badge variant="warning" className="text-xs">
                                Time may be off
                              </Badge>
                            ) : null}
                          </div>
                          {record.scannerDeviceId ? (
                            <span className="max-w-32 truncate text-xs text-muted-foreground">
                              Phone{" "}
                              <span className="font-mono">
                                {record.scannerDeviceId.slice(0, 6)}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell
                        data-label="Details"
                        className="max-w-xs whitespace-normal text-muted-foreground"
                      >
                        {record.reason ? (
                          <span className="text-foreground">{record.reason}</span>
                        ) : record.metadata &&
                          Object.keys(record.metadata).length > 0 ? (
                          // Was a raw JSON.stringify in the cell. The same
                          // facts, read as a sentence instead of as a payload.
                          <span>
                            {Object.entries(record.metadata)
                              .map(([key, value]) =>
                                formatAuditDetail(key, value),
                              )
                              .join(" · ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                Next {AUDIT_PAGE_SIZE} entries
              </PendingLink>
            </div>
          ) : null}
        </>
      ) : (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconHistory aria-hidden="true" />
            </EmptyMedia>
            {/* The title branches with the description. An event whose log is
                simply empty was told "Nothing matches" — naming a search it had
                not run. The roster's empty state already makes this
                distinction; this one only made it in the sentence below. */}
            <EmptyTitle>
              {isFiltered || initialQuery
                ? "Nothing matches"
                : "Nothing recorded yet"}
            </EmptyTitle>
            <EmptyDescription>
              {isFiltered || initialQuery
                ? "The whole log was searched, not just the visible page. Try a shorter search or a different filter."
                : "Activity on this event — registrations, scans, and organizer changes — appears here as it happens."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
