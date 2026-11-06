"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconCloudCheck,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

function formatSnapshotAge(generatedAt: string, now: Date) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(generatedAt).getTime()) / 1000),
  );
  if (elapsedSeconds < 60) return "less than a minute old";
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} old`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} old`;
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
}: {
  eventId: string;
  eventSuspended: boolean;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [storageStatus, setStorageStatus] = useState<"loading" | "ready" | "error">("loading");
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [snapshot, setSnapshot] = useState<OfflineEventSnapshot | null>(null);
  const [online, setOnline] = useState(true);
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
        setDeviceLabel(device.label);
        setSnapshot(cachedSnapshot);
        setStorageStatus("ready");
      })
      .catch(() => {
        if (active) {
          setStorageStatus("error");
          setError(
            "Offline storage could not be opened. Retry, or use a browser with storage enabled. Online check-in is still available while connected.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [storageAttempt]);

  useEffect(() => {
    function updateConnectivity() {
      setOnline(navigator.onLine);
    }
    updateConnectivity();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

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
          "Current staff access to this event is required to prepare it for offline admission.",
        );
        return;
      }
      if (result.outcome === "event_unavailable") {
        setError("This event cannot be prepared for offline use.");
        return;
      }
      if (result.outcome === "expired") {
        setError(
          "Check-in has closed. This event can no longer be prepared for offline use.",
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
        "The guest list could not be downloaded. Check that this device is online, then try again.",
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

  return (
    <section
      aria-labelledby="offline-preparation-heading"
      className="panel p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="offline-preparation-heading" className="text-lg font-headline">
            {readiness === "ready"
              ? currentSnapshot?.tickets.length === 0
                ? "No tickets saved yet"
                : "Ready to work offline"
              : "Get this phone ready for no signal"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {readiness === "ready" && currentSnapshot
              ? currentSnapshot.tickets.length === 0
                ? online
                  ? "Online checks use the server. Refresh this list after guests confirm to check them in offline."
                  : "No tickets are saved for offline checks. Connect and refresh after guests confirm."
                : `${currentSnapshot.tickets.length} tickets on ${deviceLabel}`
              : "Name this phone and load the guest list while the signal is good."}
          </p>
        </div>
        <Badge variant={online ? "secondary" : "destructive"}>
          {online ? (
            <IconCloudCheck data-icon="inline-start" />
          ) : (
            <IconCloudOff data-icon="inline-start" />
          )}
          {online ? "Online" : "Offline"}
        </Badge>
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
                ? "Ready to work offline"
                : readiness === "refresh_required"
                  ? "Guest list needs a refresh"
                  : "This phone has lost access"}
            </AlertTitle>
            <AlertDescription>
              Downloaded {formatSnapshotAge(currentSnapshot.generatedAt, now)}.{" "}
              {currentSnapshot.tickets.length}{" "}
              {currentSnapshot.tickets.length === 1 ? "ticket" : "tickets"}. Works
              offline until{" "}
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
          <Field>
            <FieldLabel htmlFor="scanner-device-label">
              Name for this phone
            </FieldLabel>
            <Input
              id="scanner-device-label"
              value={deviceLabel}
              onChange={(event) => setDeviceLabel(event.target.value)}
              placeholder="Main entrance phone"
              autoComplete="off"
              maxLength={80}
              disabled={!deviceId || pending}
            />
            <FieldDescription>
              Choose a name your team can recognize, such as “North entrance”.
            </FieldDescription>
          </Field>
          <p
            id="scanner-preparation-help"
            className="text-sm text-muted-foreground"
            aria-live="polite"
          >
            {!online
              ? "Connect to the internet to load the guest list."
              : storageStatus === "error"
                ? "Offline setup is paused. Retry storage above to continue."
              : storageStatus === "loading"
                ? "Opening this browser’s offline storage…"
                : deviceLabel.trim().length < 2
                  ? "Enter a phone name with at least 2 characters to continue."
                  : "Load the guest list now so this phone can scan without a signal."}
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
