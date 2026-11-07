"use client";

import { useEffect, useState } from "react";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCircleCheck,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import type { LiveEventMetricsResult } from "@/features/events/event-metrics-policy";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

type LiveMetricsDashboardProps = {
  eventId: string;
  eventSlug: string;
  initialMetrics: LiveEventMetricsResult;
  state: "live" | "ended" | "canceled";
};

type Tone = "success" | "warning" | "destructive" | "provisional" | "neutral";

const ACTIVE_POLL_INTERVAL_MS = 5_000;
const QUIET_POLL_INTERVAL_MS = 30_000;
const MIN_BOUNDARY_DELAY_MS = 250;

function getPollingIntervalMs({
  opensAt,
  closesAt,
}: LiveEventMetricsResult["checkInWindow"]) {
  const now = Date.now();
  const opensAtMs = Date.parse(opensAt);
  const closesAtMs = Date.parse(closesAt);

  return now >= opensAtMs && now < closesAtMs
    ? ACTIVE_POLL_INTERVAL_MS
    : QUIET_POLL_INTERVAL_MS;
}

function getNextPollDelayMs({
  opensAt,
  closesAt,
}: LiveEventMetricsResult["checkInWindow"]) {
  const now = Date.now();
  const opensAtMs = Date.parse(opensAt);
  const closesAtMs = Date.parse(closesAt);

  if (now < opensAtMs) {
    return Math.min(
      QUIET_POLL_INTERVAL_MS,
      Math.max(MIN_BOUNDARY_DELAY_MS, opensAtMs - now),
    );
  }

  if (now < closesAtMs) {
    return Math.min(
      ACTIVE_POLL_INTERVAL_MS,
      Math.max(MIN_BOUNDARY_DELAY_MS, closesAtMs - now),
    );
  }

  return QUIET_POLL_INTERVAL_MS;
}

const BAR_TONE: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  provisional: "bg-provisional",
  neutral: "bg-primary",
};

const TEXT_TONE: Record<Tone, string> = {
  success: "text-success-text",
  warning: "text-warning-text",
  destructive: "text-destructive-text",
  provisional: "text-provisional-text",
  neutral: "text-foreground",
};

function percentOf(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

/**
 * A count is not judgeable on its own — "7 duplicates" means nothing without
 * "of 412 attempts". Every figure on this screen carries its denominator and a
 * proportional bar.
 */
function ProportionRow({
  label,
  value,
  total,
  tone = "neutral",
  unit = "",
}: {
  label: string;
  value: number;
  total: number;
  tone?: Tone;
  unit?: string;
}) {
  const percentage = percentOf(value, total);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          <span className={cn("font-medium", TEXT_TONE[tone])}>
            {value.toLocaleString()}
          </span>
          {total > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              of {total.toLocaleString()}
              {unit}, {percentage}%
            </span>
          ) : null}
        </span>
      </div>
      {/* The line above already reads "Accepted 12 / 40 · 30%". Giving the bar
          `role="img"` and the same sentence again made every row announce
          twice. */}
      <div
        aria-hidden="true"
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", BAR_TONE[tone])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Headline({
  question,
  value,
  of,
  caption,
  tone = "neutral",
}: {
  question: string;
  value: number;
  of: number;
  caption: string;
  tone?: Tone;
}) {
  const percentage = percentOf(value, of);
  return (
    <div className="flex h-full flex-col gap-3 p-5 sm:p-6">
      <p className="text-sm font-semibold text-muted-foreground">{question}</p>
      <p className="flex items-baseline gap-2">
        <span className="type-figure">{value.toLocaleString()}</span>
        {of > 0 ? (
          <span className="text-lg text-muted-foreground tabular-nums">
            of {of.toLocaleString()}
          </span>
        ) : null}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", BAR_TONE[tone])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {of > 0 ? caption : "No confirmed guests."}
      </p>
    </div>
  );
}

export function LiveMetricsDashboard({
  eventId,
  eventSlug,
  initialMetrics,
  state,
}: LiveMetricsDashboardProps) {
  const [metrics, setMetrics] =
    useState<LiveEventMetricsResult>(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyRegistrationLink() {
    try {
      await navigator.clipboard.writeText(
        new URL(`/e/${eventSlug}`, window.location.origin).href,
      );
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }
  const [pollingIntervalMs, setPollingIntervalMs] = useState(() =>
    getPollingIntervalMs(initialMetrics.checkInWindow),
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(
    new Date(initialMetrics.refreshedAt),
  );

  const { opensAt, closesAt } = metrics.checkInWindow;

  useEffect(() => {
    let isMounted = true;
    let isRunning = false;
    let pollingGeneration = 0;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const checkInWindow = { opensAt, closesAt };

    async function fetchMetrics() {
      if (!isMounted || document.visibilityState === "hidden" || controller) {
        return;
      }

      const requestController = new AbortController();
      controller = requestController;

      try {
        setIsRefreshing(true);
        const res = await fetch(
          `/api/events/${encodeURIComponent(eventId)}/live-metrics`,
          {
            signal: requestController.signal,
            cache: "no-store",
          },
        );
        if (res.ok) {
          const data: LiveEventMetricsResult = await res.json();
          if (isMounted && !requestController.signal.aborted) {
            setMetrics(data);
            setLastRefreshedAt(new Date(data.refreshedAt));
            setRefreshFailed(false);
          }
        } else if (isMounted) {
          setRefreshFailed(true);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (isMounted) setRefreshFailed(true);
      } finally {
        if (controller === requestController) {
          controller = null;
          if (isMounted) setIsRefreshing(false);
        }
      }
    }

    function scheduleNextPoll(generation: number) {
      if (
        !isMounted ||
        !isRunning ||
        generation !== pollingGeneration ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      const delay = getNextPollDelayMs(checkInWindow);
      setPollingIntervalMs(getPollingIntervalMs(checkInWindow));
      timeout = setTimeout(() => {
        timeout = null;
        void fetchMetrics().finally(() => scheduleNextPoll(generation));
      }, delay);
    }

    function stopPolling() {
      isRunning = false;
      pollingGeneration += 1;
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }

      controller?.abort();
      controller = null;
      if (isMounted) {
        setIsRefreshing(false);
        setIsPolling(false);
      }
    }

    function startPolling() {
      if (isRunning || !isMounted || document.visibilityState === "hidden") {
        return;
      }

      isRunning = true;
      const generation = ++pollingGeneration;
      setIsPolling(true);
      void fetchMetrics().finally(() => scheduleNextPoll(generation));
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stopPolling();
        return;
      }

      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.visibilityState === "visible") {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      isMounted = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [closesAt, eventId, opensAt]);

  const {
    overview,
    scanAttemptStats,
    checkInConflictStats,
    offlineScanStats,
    deliveryOutcomes,
    checkInsOverTime,
  } = metrics;

  // "Is anything wrong?" is one of the three questions this screen exists to
  // answer, so it is computed rather than left for an organizer to infer by
  // scanning fourteen loose numbers.
  const attentionCandidates: Array<{
    label: string;
    count: number;
    tone: Tone;
    href: string;
  }> = [
    {
      label: "Conflicts to resolve",
      count: checkInConflictStats.unresolved,
      tone: "destructive",
      href: `/events/${eventId}/check-in`,
    },
    {
      label: "Emails that failed",
      count: deliveryOutcomes.permanentFailure,
      tone: "destructive",
      href: `/events/${eventId}/registrations?status=email_failed`,
    },
  ];
  const attention = attentionCandidates.filter((item) => item.count > 0);

  const maxHourly = Math.max(...checkInsOverTime.map((p) => p.count), 0);
  // A brand-new event has nothing to chart. Four panels of zeros told an
  // organizer nothing and buried the one thing to do: share the link.
  const hasDoorActivity =
    scanAttemptStats.total > 0 || checkInsOverTime.length > 0;
  const hasActivity = hasDoorActivity || deliveryOutcomes.total > 0;

  return (
    <div className="flex flex-col gap-6">
      {state === "live" ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full transition-colors",
              refreshFailed
                ? "bg-warning"
                : isPolling
                  ? "bg-success"
                  : "bg-muted-foreground",
              isRefreshing && "animate-pulse",
            )}
          />
          <span>
            {refreshFailed
              ? "Reconnecting"
              : isPolling
                ? `Live, updates every ${pollingIntervalMs / 1000} seconds.`
                : "Paused while this tab is hidden"}
          </span>
          <time
            dateTime={lastRefreshedAt.toISOString()}
            suppressHydrationWarning
            className="hidden tabular-nums sm:inline"
          >
            Last updated {lastRefreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </time>
        </p>

      </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {state === "canceled"
            ? "Final counts from before this event was canceled."
            : "This event has ended. These are the final counts."}
        </p>
      )}

      {refreshFailed ? (
        <Alert variant="warning">
          <IconAlertTriangle aria-hidden="true" />
          <AlertTitle>Counts may be out of date</AlertTitle>
          <AlertDescription>
            The latest update could not be loaded. Showing the last successful
            counts and retrying automatically.
          </AlertDescription>
        </Alert>
      ) : null}

      {overview.confirmedRegistrations === 0 && state === "live" ? (
        <Empty className="panel p-6 sm:p-8">
          <EmptyHeader>
            <EmptyTitle>Welcome your first confirmed guest</EmptyTitle>
            <EmptyDescription>
              Share your registration page with guests. Confirmed registrations
              and arrivals will appear here as they happen.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              className="min-h-11"
              onClick={() => void copyRegistrationLink()}
              aria-label="Copy registration link"
            >
              {copyState === "copied" ? (
                <IconCheck data-icon="inline-start" />
              ) : (
                <IconCopy data-icon="inline-start" />
              )}
              {copyState === "copied"
                ? "Link copied"
                : "Copy registration link"}
            </Button>
            <PendingLink
              href={`/e/${eventSlug}`}
              target="_blank"
              className={buttonVariants({
                variant: "outline",
                className: "min-h-11",
              })}
            >
              Open registration page
            </PendingLink>
            <p
              role="status"
              className={
                copyState === "failed"
                  ? "text-sm text-destructive-text"
                  : "sr-only"
              }
            >
              {copyState === "failed"
                ? "Could not copy the link. Open the registration page and copy its address."
                : copyState === "copied"
                  ? "Registration link copied."
                  : ""}
            </p>
          </EmptyContent>
        </Empty>
      ) : null}

      {/* One grouped region with internal dividers, rather than fourteen numbers
          spread across four floating cards. */}
      <section
        aria-label="Event status at a glance"
        className="panel grid overflow-hidden sm:grid-cols-2 lg:grid-cols-3"
      >
        <Headline
          question="Arrived"
          value={overview.activeCheckIns}
          of={overview.confirmedRegistrations}
          caption={`${percentOf(overview.activeCheckIns, overview.confirmedRegistrations)}% of confirmed guests are in`}
          tone="neutral"
        />
        <div className="border-t sm:border-t-0 sm:border-l">
          <Headline
            question="Places taken"
            value={overview.capacityUtilization.claimed}
            of={overview.eventCapacity}
            caption={`${overview.capacityUtilization.remaining.toLocaleString()} left${
              overview.waitlistEntries > 0
                ? `, ${overview.waitlistEntries.toLocaleString()} on the waitlist`
                : ""
            }`}
            tone={
              overview.capacityUtilization.percentage >= 100
                ? "warning"
                : "neutral"
            }
          />
        </div>
        {/* A problem takes the door's own colour, so it cannot be missed from
            across a room. A clear state stays quiet. */}
        <div
          className={cn(
            "border-t sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l",
            attention.length > 0 &&
              "poster-surface signal-surface bg-poster-refused text-poster-ink",
          )}
        >
          <div className="flex h-full flex-col gap-3 p-5 sm:p-6">
            <p
              className={cn(
                "text-sm font-semibold",
                attention.length === 0 && "text-muted-foreground",
              )}
            >
              Needs attention
            </p>
            {attention.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center gap-1">
                <p className="flex items-center gap-2 text-xl font-headline">
                  <IconCircleCheck
                    aria-hidden="true"
                    className="size-6 text-success-text"
                  />
                  All clear
                </p>
                <p className="text-sm text-muted-foreground">
                  No conflicts, and no emails have failed.
                </p>
              </div>
            ) : (
              <ul className="flex flex-1 flex-col justify-center gap-1">
                {attention.map((item) => (
                  <li key={item.label}>
                    <PendingLink
                      href={item.href}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md text-base font-semibold hover:underline"
                      pendingLabel="Opening"
                    >
                      <span>{item.label}</span>
                      <span className="type-figure text-3xl!">
                        {item.count.toLocaleString()}
                      </span>
                    </PendingLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {hasDoorActivity ? (
      <section
        aria-labelledby="arrivals-heading"
        className="panel flex flex-col gap-4 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="arrivals-heading" className="text-lg font-headline">
            Arrivals by hour
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            Busiest hour: {maxHourly.toLocaleString()} guests
          </p>
        </div>

        {checkInsOverTime.length > 0 ? (
          /*
            Values are always rendered rather than revealed on hover. Hover
            does not exist on a phone, which is where an organizer actually
            watches a door, so the chart previously had no numbers at all
            there — and state must never hide behind hover.

            `<table>` rather than divs so the series is readable by a screen
            reader and keyboard as an ordinary two-column table; the bars are
            presentational decoration layered on the same cells.

            Two corrections to that intent. The roles are stated explicitly
            because `display: flex` on `tbody` and `tr` — which is what stands
            the bars up — drops the implicit table semantics the markup was
            chosen for. And the row header now comes first in the markup: with
            the hour label last, the columns declared above lined up against
            the wrong cells, so the count was announced as the hour. Reading
            order belongs to the markup, stacking order to `order-*`.
          */
          <table className="mb-6 w-full" role="table">
            <caption className="sr-only">
              Arrivals per hour, in the event time zone
            </caption>
            <thead className="sr-only" role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Hour
                </th>
                <th scope="col" role="columnheader">
                  Arrivals
                </th>
              </tr>
            </thead>
            <tbody
              role="rowgroup"
              className="flex h-44 items-end gap-3 border-b pt-4 sm:h-52"
            >
              {checkInsOverTime.map((point) => (
                <tr
                  key={point.hourIso}
                  role="row"
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <th
                    scope="row"
                    role="rowheader"
                    className="order-3 -mb-6 w-full truncate text-center text-xs font-normal text-muted-foreground"
                  >
                    {point.label}
                  </th>
                  <td
                    role="cell"
                    className="order-1 text-sm font-semibold tabular-nums"
                  >
                    {point.count}
                  </td>
                  <td
                    aria-hidden="true"
                    className="order-2 w-full max-w-14 rounded-t-sm bg-foreground/85"
                    style={{
                      height: `${maxHourly > 0 ? Math.max(8, Math.round((point.count / maxHourly) * 100)) : 0}%`,
                    }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nobody has been checked in yet.
          </p>
        )}
      </section>
      ) : null}

      {hasActivity ? (
      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="scan-outcomes-heading"
          className="panel flex flex-col gap-4 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="scan-outcomes-heading" className="text-lg font-headline">
              Scan outcomes
            </h2>
            <PendingLink
              href={`/events/${eventId}/audit`}
              className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline md:min-h-6"
              pendingLabel="Opening"
            >
              Audit log
              <IconArrowRight aria-hidden="true" className="size-3.5" />
            </PendingLink>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {scanAttemptStats.total.toLocaleString()} scans,{" "}
            {offlineScanStats.received.toLocaleString()} made offline
            {offlineScanStats.lowConfidenceReceived > 0
              ? `. ${offlineScanStats.lowConfidenceReceived.toLocaleString()} have an uncertain time.`
              : ""}
          </p>
          <div className="flex flex-col gap-3">
            <ProportionRow
              label="Accepted"
              value={scanAttemptStats.accepted}
              total={scanAttemptStats.total}
              tone="success"
            />
            <ProportionRow
              label="Already checked in"
              value={scanAttemptStats.duplicate}
              total={scanAttemptStats.total}
              tone="warning"
            />
            <ProportionRow
              label="Turned away"
              value={
                scanAttemptStats.invalid +
                scanAttemptStats.unknown +
                scanAttemptStats.canceled +
                scanAttemptStats.replaced +
                scanAttemptStats.expired +
                scanAttemptStats.outsideWindow
              }
              total={scanAttemptStats.total}
              tone="destructive"
            />
            {scanAttemptStats.notCheckedIn > 0 ? (
              <ProportionRow
                label="No active check-in"
                value={scanAttemptStats.notCheckedIn}
                total={scanAttemptStats.total}
              />
            ) : null}
            <ProportionRow
              label="Raised a conflict"
              value={scanAttemptStats.conflict}
              total={scanAttemptStats.total}
              tone="provisional"
            />
          </div>
        </section>

        <section
          aria-labelledby="delivery-heading"
          className="panel flex flex-col gap-4 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="delivery-heading" className="text-lg font-headline">
              Email delivery
            </h2>
            <PendingLink
              href={`/events/${eventId}/registrations`}
              className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline md:min-h-6"
              pendingLabel="Opening"
            >
              Guests
              <IconArrowRight aria-hidden="true" className="size-3.5" />
            </PendingLink>
          </div>
          {deliveryOutcomes.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emails yet. Tickets go out when guests confirm or when you
              finish a CSV import.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground tabular-nums">
                {deliveryOutcomes.total.toLocaleString()}{" "}
                {deliveryOutcomes.total === 1 ? "message" : "messages"}
              </p>
              <div className="flex flex-col gap-3">
                <ProportionRow
                  label="Delivered"
                  value={deliveryOutcomes.delivered + deliveryOutcomes.sent}
                  total={deliveryOutcomes.total}
                  tone="success"
                />
                <ProportionRow
                  label="In flight"
                  value={deliveryOutcomes.pending + deliveryOutcomes.submitted}
                  total={deliveryOutcomes.total}
                  tone="neutral"
                />
                <ProportionRow
                  label="Retrying"
                  value={deliveryOutcomes.transientFailure}
                  total={deliveryOutcomes.total}
                  tone="warning"
                />
                <ProportionRow
                  label="Permanently failed"
                  value={deliveryOutcomes.permanentFailure}
                  total={deliveryOutcomes.total}
                  tone="destructive"
                />
              </div>
            </>
          )}
        </section>
      </div>
      ) : null}

      {/* Only when there is something to report. A line reading "0 resolved
          automatically, 0 by an organizer, of 0 total" floated unanchored under
          two panels and told an organizer nothing at all. */}
      {checkInConflictStats.total > 0 ? (
        <p className="text-sm text-muted-foreground">
          {checkInConflictStats.total.toLocaleString()}{" "}
          {checkInConflictStats.total === 1 ? "conflict" : "conflicts"} so far:{" "}
          {checkInConflictStats.resolvedAuto.toLocaleString()} settled
          automatically, {checkInConflictStats.resolvedManual.toLocaleString()}{" "}
          by an organizer, {checkInConflictStats.unresolved.toLocaleString()}{" "}
          still open.
        </p>
      ) : null}
    </div>
  );
}
