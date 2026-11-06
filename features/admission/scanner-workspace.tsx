"use client";

import {
  FormEvent,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  IconAlertTriangle,
  IconCamera,
  IconCloudUpload,
  IconScan,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";

import {
  quickReverseCheckInAction,
  scanTicketAction,
} from "@/app/scanner/[eventId]/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type {
  AdmissionOutcome,
  AdmissionResult,
} from "@/features/admission/server/admission-application";
import { cn } from "@/lib/utils";
import { admitOffline } from "./offline-scan";
import { admitWithOfflineFallback } from "./scanner-admission";
import { offlineScannerStore } from "./offline-snapshot-store";
import { synchronizePendingAttempts } from "./offline-synchronization-client";
import { ScannerPreparation } from "./scanner-preparation";
import { ReasonedCheckInAction } from "./reasoned-check-in-action";
import { PwaUpdateManager } from "./pwa-update-manager";
import { ScanOutcome, outcomePresentation } from "./scan-outcome";

type ScannerControls = { stop: () => void };
type CameraSession = {
  cancelled: boolean;
  controls: ScannerControls | null;
};

function announceFeedback(outcome: AdmissionOutcome, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const admitted = outcome === "accepted" || outcome === "provisional";
    navigator.vibrate?.(admitted ? 90 : [80, 60, 80]);
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = admitted ? 880 : 220;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Admission feedback remains complete through visible text and icon states.
  }
}

function ReverseAcceptedCheckIn({
  eventId,
  checkInId,
  actorRole,
  onCompleted,
}: {
  eventId: string;
  checkInId: string;
  actorRole: string;
  onCompleted: () => void;
}) {
  return (
    <ReasonedCheckInAction
      label={
        actorRole === "check_in_volunteer"
          ? "Quick Reversal"
          : "Reverse check-in"
      }
      title="Make this ticket admissible again?"
      description="The check-in is undone and both it and the scan are kept on record. The ticket can be admitted again."
      reasonDescription="The correction, and your reason for it, are kept permanently."
      // Outline, not destructive. This sits on the mint success surface, where
      // a pink tint reads as an error rather than the secondary action it is.
      variant="outline"
      action={async (reason) => {
        const reversed = await quickReverseCheckInAction({
          eventId,
          checkInId,
          reason,
        });
        return reversed.outcome === "reversed"
          ? { outcome: "reversed" as const }
          : reversed;
      }}
      onCompleted={onCompleted}
    />
  );
}

export function ScannerWorkspace({
  eventId,
  eventStatus,
  eventSuspended,
  actorRole,
  checkInWindow,
}: {
  eventId: string;
  eventStatus: string;
  eventSuspended: boolean;
  actorRole: string;
  checkInWindow: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraSessionRef = useRef<CameraSession | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const syncingRef = useRef(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<AdmissionResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const [pendingAttemptCount, setPendingAttemptCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<{
    value: string;
    method: "camera" | "manual";
  } | null>(null);

  useEffect(
    () => () => {
      const session = cameraSessionRef.current;
      cameraSessionRef.current = null;
      if (session) {
        session.cancelled = true;
        session.controls?.stop();
      }
    },
    [],
  );

  const refreshPendingCount = useCallback(async () => {
    setPendingAttemptCount(
      await offlineScannerStore.countPendingScanAttempts(eventId),
    );
  }, [eventId]);

  const synchronize = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const synchronized = await synchronizePendingAttempts(eventId);
      if (synchronized.acknowledged > 0) {
        const conflicts = synchronized.reconciledOutcomes.filter(
          (outcome) => outcome === "conflict",
        ).length;
        const lostConflicts = synchronized.reconciledOutcomes.filter(
          (outcome) => outcome === "duplicate",
        ).length;
        const acceptedConflicts = synchronized.reconciledOutcomes.filter(
          (outcome) => outcome === "accepted",
        ).length;
        const resolutionParts = [];
        if (conflicts > 0) {
          resolutionParts.push(
            `${conflicts} provisional acceptance${conflicts === 1 ? " requires" : "s require"} Organizer review and ${conflicts === 1 ? "is" : "are"} not globally final`,
          );
        }
        if (lostConflicts > 0) {
          resolutionParts.push(
            `${lostConflicts} provisional acceptance${lostConflicts === 1 ? " did" : "s did"} not become the authoritative check-in`,
          );
        }
        if (acceptedConflicts > 0) {
          resolutionParts.push(
            `${acceptedConflicts} provisional acceptance${acceptedConflicts === 1 ? " is" : "s are"} now authoritative`,
          );
        }
        const resolution =
          resolutionParts.length > 0
            ? ` ${resolutionParts.join("; ")}.`
            : synchronized.changed > 0
              ? ` ${synchronized.changed} reconciled with authoritative server state.`
              : "";
        setSyncMessage(
          `${synchronized.acknowledged} scan attempt${synchronized.acknowledged === 1 ? "" : "s"} synchronized.${resolution}`,
        );
      }
      await refreshPendingCount();
      const cached = await offlineScannerStore.getCachedSnapshot();
      if (cached && cached.event.id === eventId) {
        const purged =
          await offlineScannerStore.purgeEventIfClosedAndAcknowledged(
            eventId,
            cached.event.checkInClosesAt,
          );
        if (purged) {
          setSyncMessage(
            "Check-in closed and all attempts acknowledged: cached event data purged.",
          );
        }
      }
    } catch {
      setSyncMessage(
        "Pending scan attempts remain safely stored. Retry when connectivity is stable.",
      );
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [eventId, refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => void synchronize();
    window.addEventListener("online", handleOnline);
    const initialization = window.setTimeout(() => {
      void refreshPendingCount();
      if (navigator.onLine) void synchronize();
    }, 0);
    const retryInterval = window.setInterval(() => {
      if (navigator.onLine) void synchronize();
    }, 15_000);
    return () => {
      window.clearTimeout(initialization);
      window.clearInterval(retryInterval);
      window.removeEventListener("online", handleOnline);
    };
  }, [eventId, refreshPendingCount, synchronize]);

  useEffect(() => {
    if (result || actionError) resultRef.current?.focus();
  }, [actionError, result]);

  async function submitInput(
    input: string,
    inputMethod: "camera" | "manual",
    overrideReason?: string,
  ) {
    if (submittingRef.current) return null;
    submittingRef.current = true;
    setIsPending(true);
    setActionError(null);
    setResult(null);
    try {
      const admission = await admitWithOfflineFallback(
        {
          eventId,
          clientAttemptId: crypto.randomUUID(),
          input,
          inputMethod,
          overrideReason,
        },
        {
          online: navigator.onLine,
          admitOnline: scanTicketAction,
          admitOffline,
        },
      );
      const nextResult = admission.result;
      setResult(nextResult);
      if (admission.source === "online" && nextResult.ticketId) {
        try {
          await offlineScannerStore.applyAdmissionResults(eventId, [
            { ticketId: nextResult.ticketId, outcome: nextResult.outcome },
          ]);
        } catch {
          setActionError(
            "The server recorded this scan, but this phone could not update its offline ticket list. Refresh the snapshot before going offline.",
          );
        }
      }
      setLastInput({ value: input, method: inputMethod });
      announceFeedback(nextResult.outcome, feedbackEnabled);
      await refreshPendingCount();
      if (inputMethod === "manual") setManualCode("");
      return nextResult;
    } catch {
      setActionError(
        "The ticket could not be checked. Confirm this device is online, then try again.",
      );
      return null;
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  async function startCamera() {
    if (cameraSessionRef.current) return;
    const session: CameraSession = { cancelled: false, controls: null };
    cameraSessionRef.current = session;
    setCameraStarting(true);
    setCameraError(null);
    setActionError(null);
    setResult(null);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (session.cancelled || cameraSessionRef.current !== session) return;
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current ?? undefined,
        (decoded, _error, callbackControls) => {
          session.controls = callbackControls;
          if (session.cancelled || cameraSessionRef.current !== session) {
            callbackControls.stop();
            return;
          }
          if (!decoded || submittingRef.current) return;
          session.cancelled = true;
          callbackControls.stop();
          session.controls = null;
          cameraSessionRef.current = null;
          setCameraStarting(false);
          setCameraActive(false);
          startTransition(() => void submitInput(decoded.getText(), "camera"));
        },
      );
      if (session.cancelled || cameraSessionRef.current !== session) {
        controls.stop();
        return;
      }
      session.controls = controls;
      setCameraStarting(false);
      setCameraActive(true);
    } catch {
      if (session.cancelled || cameraSessionRef.current !== session) {
        session.controls?.stop();
        return;
      }
      session.cancelled = true;
      session.controls?.stop();
      session.controls = null;
      cameraSessionRef.current = null;
      setCameraStarting(false);
      setCameraActive(false);
      setCameraError(
        "The camera is unavailable or was blocked. Type the ticket code below instead.",
      );
    }
  }

  function stopCamera() {
    const session = cameraSessionRef.current;
    cameraSessionRef.current = null;
    if (session) {
      session.cancelled = true;
      session.controls?.stop();
      session.controls = null;
    }
    setCameraStarting(false);
    setCameraActive(false);
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = manualCode.trim();
    if (!value) return;
    startTransition(() => void submitInput(value, "manual"));
  }

  const presentation = result ? outcomePresentation[result.outcome] : null;

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="sr-only">Scan tickets</h1>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="absolute -top-14 right-2 z-10 size-12 border-transparent bg-transparent sm:right-4"
        onClick={() => setFeedbackEnabled((enabled) => !enabled)}
        aria-label={`${feedbackEnabled ? "Turn off" : "Turn on"} sound and vibration`}
        title={`${feedbackEnabled ? "Turn off" : "Turn on"} sound and vibration`}
        aria-pressed={feedbackEnabled}
      >
        {feedbackEnabled ? <IconVolume /> : <IconVolumeOff />}
      </Button>

      {eventStatus === "canceled" ? (
        <Alert variant="destructive">
          <IconAlertTriangle aria-hidden="true" />
          <AlertTitle>This event was canceled</AlertTitle>
          <AlertDescription>
            Tickets for it are no longer valid.
          </AlertDescription>
        </Alert>
      ) : null}

      {eventSuspended ? (
        <Alert variant="warning">
          <IconAlertTriangle aria-hidden="true" />
          <AlertTitle>Event currently unavailable</AlertTitle>
          <AlertDescription>
            Online check-in is paused. This phone can keep scanning offline
            until its access expires, and waiting scans will still sync.
          </AlertDescription>
        </Alert>
      ) : null}

      {pendingAttemptCount > 0 || syncMessage ? (
        <section
          aria-label="Scan attempt synchronization"
          className="panel flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pendingAttemptCount > 0
              ? `${pendingAttemptCount} scan${pendingAttemptCount === 1 ? "" : "s"} waiting to sync from this device.`
              : syncMessage}
          </p>
          {/* Only when there is something to retry. This section also renders
              for a bare `syncMessage` — everything already synced — and the
              button then sat there permanently disabled next to the sentence
              saying so, offering an action that had already happened. */}
          {pendingAttemptCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={syncing}
              onClick={() => void synchronize()}
            >
              {syncing ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <IconCloudUpload data-icon="inline-start" />
              )}
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          ) : null}
          {pendingAttemptCount > 0 && syncMessage ? (
            <p
              className="w-full text-sm text-muted-foreground"
              aria-live="polite"
            >
              {syncMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      {presentation && result ? (
        // The decision owns the screen. It previously rendered as an 18px
        // headline with a 28px glyph, in normal flow above the camera — so a
        // volunteer had to look away from the viewfinder, and possibly scroll,
        // to find out whether to admit someone.
        //
        // No entrance animation, deliberately: a 200ms fade on a door decision
        // is 200ms of a volunteer not knowing.
        <div
          ref={resultRef}
          tabIndex={-1}
          role="alertdialog"
          aria-label={presentation.title}
          aria-live="assertive"
          className="fixed inset-0 z-50 overflow-y-auto outline-none"
        >
          <ScanOutcome
            outcome={result.outcome}
            attendeeName={result.attendeeName}
            className="min-h-full"
            actions={
              <>
                <Button
                  type="button"
                  size="lg"
                  className="h-16 text-xl"
                  onClick={() => {
                    const scannedByCamera = lastInput?.method === "camera";
                    setResult(null);
                    setLastInput(null);
                    // The camera stops to read a code. Going straight back to
                    // it saves a second tap on every guest of the night.
                    if (scannedByCamera) void startCamera();
                  }}
                >
                  <IconScan data-icon="inline-start" className="size-6!" />
                  Next scan
                </Button>
                {result.outcome === "accepted" && result.checkInId ? (
                  <ReverseAcceptedCheckIn
                    eventId={eventId}
                    checkInId={result.checkInId}
                    actorRole={actorRole}
                    onCompleted={() => {
                      if (result.ticketId) {
                        void offlineScannerStore
                          .applyAdmissionResults(eventId, [
                            {
                              ticketId: result.ticketId,
                              outcome: "not_checked_in",
                            },
                          ])
                          .catch(() => {
                            setActionError(
                              "Check-in reversed on the server. Refresh this phone's guest list before going offline.",
                            );
                          });
                      }
                      setResult(null);
                      setSyncMessage(
                        "Check-in reversed. The ticket can be admitted again.",
                      );
                    }}
                  />
                ) : null}
                {(result.outcome === "outside_window" ||
                  result.outcome === "expired") &&
                actorRole !== "check_in_volunteer" &&
                lastInput ? (
                  <ReasonedCheckInAction
                    label="Admit with override"
                    title="Admit outside the check-in Window?"
                    description="This creates an authoritative check-in outside the configured window. Use it only for an accountable operational exception."
                    reasonDescription="Only organizers can override the window, and the reason is kept permanently."
                    action={async (reason) => {
                      const override = await submitInput(
                        lastInput.value,
                        lastInput.method,
                        reason,
                      );
                      return override?.outcome === "accepted"
                        ? { outcome: "completed" as const }
                        : {
                            outcome: "error" as const,
                            message:
                              "The override was not accepted. Confirm your organizer access and connectivity.",
                          };
                    }}
                  />
                ) : null}
              </>
            }
          />
        </div>
      ) : null}

      {actionError ? (
        <Alert
          ref={resultRef}
          tabIndex={-1}
          variant="destructive"
          aria-live="assertive"
        >
          <IconAlertTriangle />
          <AlertTitle>Check-in unavailable</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="camera-heading" className="flex flex-col gap-3">
        <h2 id="camera-heading" className="sr-only">
          Camera
        </h2>
        <div className="relative aspect-square max-h-[62svh] w-full overflow-hidden rounded-[var(--radius-overlay)] bg-card sm:aspect-[4/3]">
          <video
            ref={videoRef}
            muted
            playsInline
            className={cn(
              "size-full object-cover",
              !cameraActive && "invisible",
            )}
            aria-label="Live camera preview"
          />
          <div
            aria-hidden="true"
            className="scan-reticle pointer-events-none absolute inset-6 sm:inset-10"
          />

          {!cameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              {cameraStarting ? (
                <>
                  <Spinner className="size-8" />
                  <p className="text-sm text-muted-foreground">
                    Opening your camera
                  </p>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="lg"
                    className="h-16 bg-poster-confirmed px-8 text-xl text-poster-ink hover:bg-poster-confirmed/85"
                    onClick={startCamera}
                    disabled={isPending}
                  >
                    <IconCamera data-icon="inline-start" className="size-6!" />
                    Start scanning
                  </Button>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Check-in runs {checkInWindow}
                  </p>
                </>
              )}
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="absolute bottom-3 left-1/2 z-10 h-11 -translate-x-1/2 border-transparent bg-background/70"
              onClick={stopCamera}
            >
              Stop camera
            </Button>
          )}
        </div>

        {cameraError ? (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>Camera unavailable</AlertTitle>
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section aria-label="Enter a ticket code">
        <form onSubmit={handleManualSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ticket-code">
                No camera? Type the ticket code
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="ticket-code"
                  name="ticketCode"
                  value={manualCode}
                  onChange={(event) =>
                    setManualCode(event.target.value.toUpperCase())
                  }
                  placeholder="XXXXX-XXXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={12}
                  className="h-12! min-w-0 flex-1 font-mono text-lg! tracking-code"
                />
                <Button
                  type="submit"
                  size="lg"
                  variant="secondary"
                  className="w-28"
                  aria-label="Check ticket"
                  disabled={!manualCode.trim() || isPending}
                >
                  {isPending ? <Spinner data-icon="inline-start" /> : null}
                  {isPending ? "Checking" : "Check"}
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>
      </section>
      <ScannerPreparation eventId={eventId} eventSuspended={eventSuspended} />
      <PwaUpdateManager />
    </div>
  );
}
