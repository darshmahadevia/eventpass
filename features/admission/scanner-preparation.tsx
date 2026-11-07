"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconCloudOff,
  IconDatabase,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react";

import { prepareOfflineScannerAction } from "@/app/scanner/[eventId]/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  getSnapshotReadiness,
  type OfflineEventSnapshot,
} from "./offline-snapshot";
import {
  offlineScannerStore,
  SnapshotReplacementRequiredError,
} from "./offline-snapshot-store";

type ReplacementRequest = {
  snapshot: OfflineEventSnapshot;
  currentEventName: string;
  pendingAttemptCount: number;
};

/** What the rest of the scanner needs to know about the list on this phone. */
export type GuestListSummary = {
  age: string;
  guests: OfflineEventSnapshot["tickets"];
};

function formatSnapshotAge(generatedAt: string, now: Date) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(generatedAt).getTime()) / 1000),
  );
  if (elapsedSeconds < 60) return "just now";
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function formatEventTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function ScannerPreparation({
  eventId,
  eventSuspended,
  online,
  onGuestListChange,
  className,
}: {
  eventId: string;
  eventSuspended: boolean;
  online: boolean;
  onGuestListChange: (summary: GuestListSummary | null) => void;
  className?: string;
}) {
  // One tap to get ready. The label is only stored on the device, so asking a
  // volunteer to invent one gained them nothing.
  const [deviceId, setDeviceId] = useState("");
  const [storageStatus, setStorageStatus] = useState<"loading" | "ready" | "error">("loading");
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [snapshot, setSnapshot] = useState<OfflineEventSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const detailsToggleRef = useRef<HTMLButtonElement>(null);
  const [replacement, setReplacement] = useState<ReplacementRequest | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      offlineScannerStore.getOrCreateScannerDevice(),
      offlineScannerStore.getCachedSnapshot(),
    ])
      .then(([device, cachedSnapshot]) => {
        if (!active) return;
        setDeviceId(device.id);
        // A sensible name is already there, so getting ready is one tap. The
        // team can still rename it, and a volunteer with a queue never has to.
        setDeviceLabel(device.label || "Door phone");
        setSnapshot(cachedSnapshot);
        setStorageStatus("ready");
      })
      .catch(() => {
        if (active) {
          setStorageStatus("error");
          setError(
            "This browser would not save the guest list. Try again, or keep scanning online while you have signal.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [storageAttempt]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  async function persistPreparedSnapshot(
    preparedSnapshot: OfflineEventSnapshot,
    replaceExisting = false,
  ) {
    await offlineScannerStore.cacheSnapshot(preparedSnapshot, {
      replaceExisting,
    });
    await offlineScannerStore.updateScannerDeviceLabel(deviceLabel.trim());
    setSnapshot(preparedSnapshot);
    setReplacement(null);
    setExpanded(false);
    requestAnimationFrame(() => detailsToggleRef.current?.focus());
  }

  async function prepare() {
    if (!deviceId || deviceLabel.trim().length < 2 || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await prepareOfflineScannerAction({
        eventId,
        scannerDeviceId: deviceId,
        scannerDeviceLabel: deviceLabel.trim(),
      });
      if (result.outcome === "unauthorized") {
        setError(
          "Your account no longer has access to this event. Ask an organizer to add you.",
        );
        return;
      }
      if (result.outcome === "event_unavailable") {
        setError("This event cannot be saved to this phone right now.");
        return;
      }
      if (result.outcome === "expired") {
        setError(
          "Check-in has closed, so the guest list can no longer be saved to this phone.",
        );
        return;
      }
      try {
        await persistPreparedSnapshot(result.snapshot);
      } catch (cacheError) {
        if (cacheError instanceof SnapshotReplacementRequiredError) {
          setReplacement({
            snapshot: result.snapshot,
            currentEventName: cacheError.currentEventName,
            pendingAttemptCount: cacheError.pendingAttemptCount,
          });
          return;
        }
        throw cacheError;
      }
    } catch {
      setError(
        "The guest list could not be downloaded. Check this phone has signal, then try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function confirmReplacement() {
    if (!replacement) return;
    setPending(true);
    setError(null);
    try {
      await persistPreparedSnapshot(replacement.snapshot, true);
    } catch {
      setError("The guest list could not be replaced. Try again.");
    } finally {
      setPending(false);
    }
  }

  const currentSnapshot = snapshot?.event.id === eventId ? snapshot : null;
  const readiness = currentSnapshot
    ? getSnapshotReadiness(currentSnapshot, now)
    : null;

  const listAge = currentSnapshot
    ? formatSnapshotAge(currentSnapshot.generatedAt, now)
    : null;
  useEffect(() => {
    if (storageStatus === "loading") return;
    onGuestListChange(
      currentSnapshot && listAge
        ? { age: listAge, guests: currentSnapshot.tickets }
        : null,
    );
  }, [currentSnapshot, listAge, onGuestListChange, storageStatus]);

  return (
    <section
      aria-labelledby="offline-preparation-heading"
      className={cn("panel", readiness === "ready" ? "p-3 sm:p-4" : "p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2
            id="offline-preparation-heading"
            className={readiness === "ready" ? "text-sm font-semibold" : "text-lg font-headline"}
          >
            {readiness === "ready"
              ? currentSnapshot?.tickets.length === 0
                ? "No tickets saved yet"
                : "Ready to work offline"
              : "Get this phone ready for no signal"}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {readiness === "ready" && currentSnapshot
              ? currentSnapshot.tickets.length === 0
                ? online
                  ? "Online checks use the server. Refresh this list after guests confirm to check them in offline."
                  : "No tickets are saved for offline checks. Connect and refresh after guests confirm."
                : `${currentSnapshot.tickets.length} tickets saved ${listAge}`
              : "Load the guest list while the signal is good, and this phone keeps scanning if the Wi-Fi drops."}
          </p>
        </div>
        {readiness === "ready" && currentSnapshot?.tickets.length === 0 ? (
          <Button
            className="min-h-11"
            disabled={!online || pending || eventSuspended}
            onClick={() => void prepare()}
          >
            {pending ? "Refreshing…" : "Refresh guest list"}
          </Button>
        ) : null}
        {readiness === "ready" ? (
          <Button
            ref={detailsToggleRef}
            variant="outline"
            className="min-h-11"
            aria-expanded={expanded}
            aria-controls={`preparation-details-${eventId}`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide details" : "Phone details"}
          </Button>
        ) : null}
      </div>

      <div
        id={`preparation-details-${eventId}`}
        hidden={readiness === "ready" && !expanded}
        className={cn(
          "mt-5 flex flex-col gap-5",
          readiness === "ready" && !expanded && "hidden",
        )}
      >
        {eventSuspended ? (
          <Alert variant="warning">
            <IconCloudOff />
            <AlertTitle>Event currently unavailable</AlertTitle>
            <AlertDescription>
              A new guest list cannot be loaded right now. Scans waiting on this
              phone can still sync.
            </AlertDescription>
          </Alert>
        ) : null}

        {currentSnapshot ? (
          // Three states, three signals. A stale snapshot and a dead
          // authorization both rendered destructive with the same icon, which
          // told a volunteer their phone had lost access when it had only
          // fallen behind — a refresh away from ready, not a failure.
          <Alert
            variant={
              readiness === "ready"
                ? "default"
                : readiness === "refresh_required"
                  ? "warning"
                  : "destructive"
            }
            aria-live="polite"
          >
            {readiness === "ready" ? (
              <IconShieldCheck />
            ) : readiness === "refresh_required" ? (
              <IconRefresh />
            ) : (
              <IconCloudOff />
            )}
            <AlertTitle>
              {readiness === "ready"
                ? "Guest list saved"
                : readiness === "refresh_required"
                  ? "Guest list needs a refresh"
                  : "This phone has lost access"}
            </AlertTitle>
            <AlertDescription>
              Saved {listAge}. Works offline until{" "}
              {formatEventTime(
                currentSnapshot.event.checkInClosesAt,
                currentSnapshot.event.eventTimeZone,
              )}
              .
            </AlertDescription>
          </Alert>
        ) : snapshot ? (
          <Alert>
            <IconDatabase />
            <AlertTitle>This phone holds {snapshot.event.name}</AlertTitle>
            <AlertDescription>
              Loading this event replaces the guest list on this phone. You will
              be asked to confirm.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" aria-live="assertive">
            <IconCloudOff />
            <AlertTitle>Could not get this phone ready</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            {storageStatus === "error" ? (
              <Button type="button" variant="outline" onClick={() => {
                setError(null);
                setStorageStatus("loading");
                setStorageAttempt((attempt) => attempt + 1);
              }}>
                <IconRefresh data-icon="inline-start" />
                Try again
              </Button>
            ) : null}
          </Alert>
        ) : null}

        <FieldGroup>
          <p
            id="scanner-preparation-help"
            className="text-sm text-muted-foreground empty:hidden"
            aria-live="polite"
          >
            {!online
              ? "Connect to the internet to load the guest list."
              : storageStatus === "error"
                ? "Use Try again above to continue."
              : storageStatus === "loading"
                ? "Opening this browser’s offline storage…"
                : ""}
          </p>
          <Button
            type="button"
            variant={currentSnapshot ? "outline" : "default"}
            className="min-h-11 sm:self-start"
            disabled={
              eventSuspended ||
              !online ||
              !deviceId ||
              deviceLabel.trim().length < 2 ||
              pending
            }
            onClick={() => void prepare()}
            aria-describedby="scanner-preparation-help"
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <IconDatabase data-icon="inline-start" />
            )}
            {pending
              ? "Loading…"
              : currentSnapshot
                ? "Refresh guest list"
                : "Load guest list"}
          </Button>
        </FieldGroup>
      </div>

      <AlertDialog
        open={Boolean(replacement)}
        onOpenChange={(open) => {
          if (!open && !pending) setReplacement(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the guest list on this phone?</AlertDialogTitle>
            <AlertDialogDescription>
              This phone holds {replacement?.currentEventName}. Its guest list
              will be replaced. {replacement?.pendingAttemptCount ?? 0} waiting
              scan{(replacement?.pendingAttemptCount ?? 0) === 1 ? "" : "s"} will
              be kept and still sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Keep current list
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => void confirmReplacement()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Replace guest list
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
