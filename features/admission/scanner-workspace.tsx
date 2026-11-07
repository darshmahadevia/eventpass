"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBolt,
  IconBoltOff,
  IconCamera,
  IconCloudCheck,
  IconCloudOff,
  IconCloudUpload,
  IconScan,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";

import {
  findGuestsAction,
  quickReverseCheckInAction,
  scanTicketAction,
} from "@/app/scanner/[eventId]/actions";
import { PendingLink } from "@/components/pending-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { formatTicketCode } from "@/features/tickets/ticket-code";
import { cn } from "@/lib/utils";
import { admitOffline } from "./offline-scan";
import { admitWithOfflineFallback } from "./scanner-admission";
import { offlineScannerStore } from "./offline-snapshot-store";
import { synchronizePendingAttempts } from "./offline-synchronization-client";
import { ScannerPreparation, type GuestListSummary } from "./scanner-preparation";
import { ReasonedCheckInAction } from "./reasoned-check-in-action";
import { PwaUpdateManager } from "./pwa-update-manager";
import { ScanOutcome, outcomePresentation } from "./scan-outcome";
import { useOnlineStatus } from "./use-online-status";

type ScannerControls = {
  stop: () => void;
  switchTorch?: (on: boolean) => Promise<void>;
};
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

const SAME_TICKET_QUIET_MS = 2_000;

/** Ten letters and digits in any casing or spacing, or a pasted signed ticket. */
function isTicketInput(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  return /^[0-9a-z]{10}$/i.test(compact) || value.includes(".");
}

type GuestMatch = {
  ticketCode: string;
  displayName: string;
  arrived: boolean;
};

type RecentScan = {
  id: string;
  name: string;
  label: string;
  checkInId?: string;
  ticketId?: string;
};

function ReverseAcceptedCheckIn({
  eventId,
  checkInId,
  onCompleted,
  triggerLabel,
}: {
  eventId: string;
  checkInId: string;
  onCompleted: () => void;
  triggerLabel?: string;
}) {
  return (
    <ReasonedCheckInAction
      label="Undo check-in"
      triggerLabel={triggerLabel}
      title="Undo this check-in?"
      description="The ticket can be scanned again. The original scan stays in the audit log."
      reasonDescription="Your reason is kept in the audit log."
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
  eventName,
  eventStatus,
  doorState,
  eventSuspended,
  actorRole,
  checkInWindow,
  exitHref,
}: {
  eventId: string;
  eventName: string;
  eventStatus: string;
  doorState: "before" | "open" | "after";
  eventSuspended: boolean;
  actorRole: string;
  checkInWindow: string;
  exitHref: string;
}) {
  const online = useOnlineStatus();
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const nextScanRef = useRef<HTMLButtonElement>(null);
  // The code just decided, and until when to ignore it. A guest still holding
  // their phone up is normal, and the restarted camera read it straight back as
  // "Already checked in" for someone who had just been let in.
  const settledCodeRef = useRef<{ text: string; until: number } | null>(null);
  // `undefined` until this phone's storage has answered.
  const [guestList, setGuestList] = useState<
    GuestListSummary | null | undefined
  >(undefined);
  const [sameTicketInView, setSameTicketInView] = useState(false);
  const [nameHint, setNameHint] = useState(false);
  const [remoteMatches, setRemoteMatches] = useState<GuestMatch[] | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const lookupTimer = useRef<number | undefined>(undefined);
  const [lastSource, setLastSource] = useState<"online" | "offline">("online");
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
  const [admittedCount, setAdmittedCount] = useState(0);
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

  // A phone that sleeps between guests drops the camera, so the screen stays on
  // for as long as the scanner is open. Browsers release this when hidden.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState !== "visible") return;
      void navigator.wakeLock
        ?.request("screen")
        .then((sentinel) => {
          lock = sentinel;
        })
        .catch(() => undefined);
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, []);

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
        const count = (outcome: string) =>
          synchronized.reconciledOutcomes.filter((item) => item === outcome)
            .length;
        const conflicts = count("conflict");
        const lostConflicts = count("duplicate");
        const scans = (total: number) =>
          `${total} scan${total === 1 ? "" : "s"}`;
        const notes = [
          conflicts > 0
            ? `${scans(conflicts)} need${conflicts === 1 ? "s" : ""} an organizer to review`
            : null,
          lostConflicts > 0
            ? `${scans(lostConflicts)} did not count because another phone got there first`
            : null,
        ].filter(Boolean);
        setSyncMessage(
          `${scans(synchronized.acknowledged)} synced.${notes.length > 0 ? ` ${notes.join(". ")}.` : ""}`,
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
            "Check-in has closed and every scan is synced, so the guest list was removed from this phone.",
          );
        }
      }
    } catch {
      setSyncMessage(
        "Your scans are safe on this phone. They will sync when the signal is steady.",
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

  // A decision takes focus on its one next step, so a volunteer at a keyboard
  // can answer it with Enter. The dialog's label is what a screen reader hears.
  useEffect(() => {
    if (result) nextScanRef.current?.focus();
    else if (actionError) resultRef.current?.focus();
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
      setLastSource(admission.source);
      setResult(nextResult);
      setRecentScans((current) =>
        [
          {
            id: crypto.randomUUID(),
            name: nextResult.attendeeName ?? "Unknown ticket",
            label: outcomePresentation[nextResult.outcome].title,
            checkInId: nextResult.checkInId,
            ticketId: nextResult.ticketId,
          },
          ...current,
        ].slice(0, 5),
      );
      if (
        nextResult.outcome === "accepted" ||
        nextResult.outcome === "provisional"
      ) {
        setAdmittedCount((count) => count + 1);
      }
      if (admission.source === "online" && nextResult.ticketId) {
        try {
          await offlineScannerStore.applyAdmissionResults(eventId, [
            { ticketId: nextResult.ticketId, outcome: nextResult.outcome },
          ]);
        } catch {
          setActionError(
            "This scan counted, but the guest list on this phone did not update. Refresh it before you lose signal.",
          );
        }
      }
      setLastInput({ value: input, method: inputMethod });
      announceFeedback(nextResult.outcome, feedbackEnabled);
      await refreshPendingCount();
      if (inputMethod === "manual") updateManualCode("");
      return nextResult;
    } catch {
      setActionError(
        "That ticket could not be checked. Check this phone has signal, then try again.",
      );
      return null;
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  function updateManualCode(value: string) {
    setManualCode(value);
    setNameHint(false);
    window.clearTimeout(lookupTimer.current);
    setRemoteMatches(null);
    const query = value.trim();
    // Only a phone with no saved list needs the server for this.
    if (guestList || !online || query.length < 2 || isTicketInput(query)) return;
    lookupTimer.current = window.setTimeout(() => {
      void findGuestsAction(eventId, query)
        .then(setRemoteMatches)
        .catch(() => setRemoteMatches([]));
    }, 250);
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
          const text = decoded.getText();
          const settled = settledCodeRef.current;
          if (settled?.text === text && Date.now() < settled.until) {
            // Still in frame, so keep waiting for it to leave. A deliberate
            // re-scan a moment later still gets its honest answer.
            settled.until = Date.now() + SAME_TICKET_QUIET_MS;
            setSameTicketInView(true);
            window.setTimeout(() => {
              if (Date.now() >= (settledCodeRef.current?.until ?? 0)) {
                setSameTicketInView(false);
              }
            }, SAME_TICKET_QUIET_MS + 50);
            return;
          }
          session.cancelled = true;
          callbackControls.stop();
          session.controls = null;
          cameraSessionRef.current = null;
          setCameraStarting(false);
          setCameraActive(false);
          void submitInput(text, "camera");
        },
      );
      if (session.cancelled || cameraSessionRef.current !== session) {
        controls.stop();
        return;
      }
      session.controls = controls;
      setTorchAvailable(Boolean(controls.switchTorch));
      setTorchOn(false);
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
        "The camera is blocked or in use. Allow camera access in your browser, or type the ticket code below.",
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
    // A name is a search, never a scan. Sending one to the server came back as
    // "Invalid ticket", at the exact moment a guest had no ticket to show.
    if (!isTicketInput(value)) {
      setNameHint(true);
      return;
    }
    void submitInput(value, "manual");
  }

  const presentation = result ? outcomePresentation[result.outcome] : null;
  const trimmedInput = manualCode.trim();
  const searchingByName =
    trimmedInput.length >= 2 && !isTicketInput(trimmedInput);
  const nameQuery = trimmedInput.toLowerCase();
  const nameMatches: GuestMatch[] | null = !searchingByName
    ? []
    : guestList
      ? guestList.guests
          .filter((guest) =>
            guest.displayName.toLowerCase().includes(nameQuery),
          )
          .slice(0, 6)
          .map((guest) => ({
            ticketCode: guest.ticketCode,
            displayName: guest.displayName,
            arrived: guest.existingCheckInState === "checked_in",
          }))
      : remoteMatches;

  return (
    <>
    <header className="border-b">
      <div className="mx-auto flex min-h-14 w-full max-w-2xl items-center gap-1 px-2 py-1 sm:px-4">
        <PendingLink
          href={exitHref}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={`Leave the scanner for ${eventName}`}
          pendingLabel=""
        >
          <IconArrowLeft />
        </PendingLink>
        <p className="min-w-0 flex-1 truncate font-headline">{eventName}</p>
        {/* Always on screen: whether this phone can reach the server changes
            what a scan means, and it used to sit below the fold. */}
        <Badge
          variant={online ? "secondary" : "provisional"}
          role="status"
          className="h-7 px-3"
        >
          {online ? (
            <IconCloudCheck data-icon="inline-start" />
          ) : (
            <IconCloudOff data-icon="inline-start" />
          )}
          {online ? "Online" : "Offline"}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setFeedbackEnabled((enabled) => !enabled)}
          aria-label="Sound and vibration on each scan"
          title={`${feedbackEnabled ? "Turn off" : "Turn on"} sound and vibration`}
          aria-pressed={feedbackEnabled}
        >
          {feedbackEnabled ? <IconVolume /> : <IconVolumeOff />}
        </Button>
      </div>
    </header>
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
      <h1 className="sr-only">Scan tickets for {eventName}</h1>

      {doorState !== "open" && eventStatus !== "canceled" ? (
        <Alert variant="warning">
          <IconAlertTriangle aria-hidden="true" />
          <AlertTitle>
            {doorState === "before"
              ? "Check-in has not opened yet"
              : "Check-in has closed"}
          </AlertTitle>
          <AlertDescription>
            {doorState === "before"
              ? `Check-in: ${checkInWindow}. Save the guest list now, while the signal is good.`
              : "Tickets can't be admitted now. Open this page with signal so any waiting scans sync."}
          </AlertDescription>
        </Alert>
      ) : null}

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
            Online check-in is paused. This phone can keep scanning offline,
            and waiting scans will still sync.
          </AlertDescription>
        </Alert>
      ) : null}

      {pendingAttemptCount > 0 || syncMessage ? (
        <section
          aria-label="Sync status"
          className="panel flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pendingAttemptCount > 0
              ? `${pendingAttemptCount} scan${pendingAttemptCount === 1 ? "" : "s"} waiting to sync from this phone.`
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

      <ScannerPreparation
        eventId={eventId}
        eventSuspended={eventSuspended}
        online={online}
        onGuestListChange={setGuestList}
      />

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
          aria-label={
            result.attendeeName
              ? `${presentation.title}: ${result.attendeeName}`
              : presentation.title
          }
          aria-live="assertive"
          className="fixed inset-0 z-50 overflow-y-auto outline-none"
        >
          <ScanOutcome
            outcome={result.outcome}
            attendeeName={result.attendeeName}
            className="min-h-full"
            // Offline, "not found" only means not on this phone's copy. The
            // guest may have registered after it was saved.
            {...(result.outcome === "unknown" && lastSource === "offline"
              ? {
                  title: "Not on this phone's list",
                  description: `The guest list here was saved ${guestList?.age ?? "earlier"}, so they may have registered since. Check their confirmation email, or try again once there is signal.`,
                  toneOverride: "warning" as const,
                }
              : result.outcome === "duplicate" && result.checkedInAt
                ? {
                    description: `This ticket was used at ${new Date(result.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Check with the guest before letting them through.`,
                  }
                : {})}
            actions={
              <>
                {result.outcome === "signed_out" ? (
                  <a
                    href={`/sign-in?callbackUrl=${encodeURIComponent(`/scanner/${eventId}`)}`}
                    className={buttonVariants({ size: "lg", className: "h-16 text-xl" })}
                  >
                    Sign in
                  </a>
                ) : null}
                <Button
                  ref={nextScanRef}
                  type="button"
                  size="lg"
                  className="h-16 text-xl"
                  onClick={() => {
                    const scannedByCamera = lastInput?.method === "camera";
                    setResult(null);
                    setLastInput(null);
                    // The camera stops to read a code. Going straight back to
                    // it saves a second tap on every guest of the night; typing
                    // goes straight back to the box for the same reason.
                    if (scannedByCamera && lastInput) {
                      settledCodeRef.current = {
                        text: lastInput.value,
                        until: Date.now() + SAME_TICKET_QUIET_MS,
                      };
                      void startCamera();
                    } else
                      requestAnimationFrame(() =>
                        manualInputRef.current?.focus(),
                      );
                  }}
                >
                  <IconScan data-icon="inline-start" className="size-6!" />
                  Next scan
                </Button>
                {result.outcome === "accepted" && result.checkInId ? (
                  <ReverseAcceptedCheckIn
                    eventId={eventId}
                    checkInId={result.checkInId}
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
                              "Check-in undone. Refresh this phone's guest list before you lose signal.",
                            );
                          });
                      }
                      setResult(null);
                      setSyncMessage(
                        "Check-in undone. The ticket can be scanned again.",
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
                    title="Admit outside check-in hours?"
                    description="This checks the guest in even though check-in is not open. Use it only for a genuine exception."
                    reasonDescription="Your reason is kept in the audit log."
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
                              "That did not go through. Check this phone has signal and try again.",
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
        <div
          className={cn(
            "relative max-h-[62svh] w-full overflow-hidden rounded-[var(--radius-overlay)] bg-card sm:aspect-[4/3]",
            // Idle, the viewfinder has nothing to show, so it gives its height
            // to phone setup. Live, it takes the square a QR code needs.
            cameraActive ? "aspect-square" : "aspect-[5/3]",
          )}
        >
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
          {cameraActive && sameTicketInView ? (
            <p
              role="status"
              className="absolute inset-x-4 top-3 z-10 rounded-md bg-background px-3 py-2 text-center text-sm font-semibold"
            >
              Same ticket. Ready for the next guest.
            </p>
          ) : null}
          <div
            aria-hidden="true"
            className="scan-reticle pointer-events-none absolute inset-4 sm:inset-10"
          />

          {!cameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              {isPending ? (
                <>
                  <Spinner className="size-8" />
                  <p className="text-sm text-muted-foreground" role="status">
                    Checking ticket
                  </p>
                </>
              ) : cameraStarting ? (
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
                    Check-in: {checkInWindow}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 border-transparent bg-background dark:bg-background"
                onClick={stopCamera}
              >
                Stop camera
              </Button>
              {torchAvailable ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-transparent bg-background dark:bg-background"
                  aria-pressed={torchOn}
                  onClick={() => {
                    const next = !torchOn;
                    void cameraSessionRef.current?.controls
                      ?.switchTorch?.(next)
                      .then(() => setTorchOn(next))
                      .catch(() => setTorchAvailable(false));
                  }}
                >
                  {torchOn ? <IconBolt data-icon="inline-start" /> : <IconBoltOff data-icon="inline-start" />}
                  Light
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {cameraError ? (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>Camera unavailable</AlertTitle>
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        ) : null}
        {admittedCount > 0 ? (
          <p className="text-center text-sm text-muted-foreground" role="status">
            {admittedCount} checked in on this phone so far
          </p>
        ) : null}
      </section>

      <section aria-label="Find a ticket by code or name">
        <form onSubmit={handleManualSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ticket-code">
                No QR code? Type a ticket code or guest name
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  ref={manualInputRef}
                  id="ticket-code"
                  name="ticketCode"
                  value={manualCode}
                  onChange={(event) => updateManualCode(event.target.value)}
                  placeholder="Code or name"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={80}
                  className="h-12! min-w-0 flex-1 text-lg!"
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
        {searchingByName ? (
          <div className="mt-2">
            {!guestList && !online ? (
              <p className="text-sm text-muted-foreground" role="status">
                Name search needs signal, or the guest list saved on this phone.
              </p>
            ) : nameMatches === null ? (
              <p className="text-sm text-muted-foreground" role="status">
                Searching…
              </p>
            ) : nameMatches.length > 0 ? (
              <>
                {nameHint ? (
                  <p className="mb-2 text-sm font-semibold" role="status">
                    Tap the guest to check them in.
                  </p>
                ) : null}
                <ul
                  aria-label="Guests matching that name"
                  className="panel divide-y overflow-hidden"
                >
                  {nameMatches.map((guest) => (
                    <li key={guest.ticketCode}>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          updateManualCode("");
                          void submitInput(guest.ticketCode, "manual");
                        }}
                        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset"
                      >
                        <span className="min-w-0 truncate font-semibold">
                          {guest.displayName}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {guest.arrived ? (
                            "Already in"
                          ) : (
                            <span className="font-mono tracking-code">
                              {formatTicketCode(guest.ticketCode)}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">
                  No QR code means no proof of the ticket, so check their ID
                  before you tap a name.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground" role="status">
                Nobody matches that name.
                {guestList
                  ? " They may have registered after this list was saved."
                  : ""}
              </p>
            )}
          </div>
        ) : null}
      </section>
      {recentScans.length > 0 ? (
        <section aria-labelledby="recent-scans-heading">
          <h2
            id="recent-scans-heading"
            className="mb-2 text-sm font-semibold text-muted-foreground"
          >
            Recent on this phone
          </h2>
          <ul className="panel divide-y">
            {recentScans.map((scan) => (
              <li
                key={scan.id}
                className="flex min-h-12 items-center justify-between gap-3 px-4 py-1.5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {scan.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {scan.label}
                  </span>
                </span>
                {scan.checkInId ? (
                  <ReverseAcceptedCheckIn
                    eventId={eventId}
                    checkInId={scan.checkInId}
                    triggerLabel="Undo"
                    onCompleted={() => {
                      if (scan.ticketId) {
                        void offlineScannerStore
                          .applyAdmissionResults(eventId, [
                            { ticketId: scan.ticketId, outcome: "not_checked_in" },
                          ])
                          .catch(() => undefined);
                      }
                      setRecentScans((current) =>
                        current.map((item) =>
                          item.id === scan.id
                            ? {
                                ...item,
                                label: "Check-in undone",
                                checkInId: undefined,
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PwaUpdateManager />
    </div>
    </>
  );
}
