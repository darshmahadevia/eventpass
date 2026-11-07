"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconCheck,
  IconMailForward,
  IconTicketOff,
  IconUserCheck,
} from "@tabler/icons-react";

import {
  cancelGuestAction,
  checkInGuestAction,
  resendGuestTicketAction,
  updateGuestAction,
} from "@/app/(workspace)/events/[eventId]/(sections)/registrations/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { outcomePresentation } from "@/features/admission/scan-outcome";
import { formatTicketCode } from "@/features/tickets/ticket-code";

type Feedback = { ok: boolean; message: string } | null;

/**
 * Everything an organizer does for one guest, in one place: fix a typo, send
 * the ticket again, let them in by hand, or cancel.
 */
export function ManageGuest({
  eventId,
  registrationId,
  name,
  email,
  ticketCode,
  canAdmit,
}: {
  eventId: string;
  registrationId: string;
  name: string;
  email: string;
  ticketCode: string | null;
  /** Confirmed, holding a ticket, and not already through the door. */
  canAdmit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function run(work: () => Promise<Feedback>) {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await work());
      router.refresh();
    });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() =>
      updateGuestAction(eventId, registrationId, {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
      }),
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFeedback(null);
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={`Manage ${name}`}
            className="mt-2"
          />
        }
      >
        Manage
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-5 data-[side=right]:w-full sm:max-w-md"
      >
        <SheetTitle className="min-h-8 pr-12 text-lg font-headline wrap-anywhere">
          {name}
        </SheetTitle>
        {ticketCode ? (
          <p className="font-mono text-sm tracking-code text-muted-foreground">
            {formatTicketCode(ticketCode)}
          </p>
        ) : null}

        {feedback ? (
          <Alert
            role="status"
            variant={feedback.ok ? "success" : "destructive"}
            className="mt-4"
          >
            {feedback.ok ? (
              <IconCheck aria-hidden="true" />
            ) : (
              <IconAlertCircle aria-hidden="true" />
            )}
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={save} className="mt-5 flex flex-col gap-4" noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`guest-name-${registrationId}`}>Name</FieldLabel>
              <Input
                id={`guest-name-${registrationId}`}
                name="name"
                defaultValue={name}
                autoComplete="off"
                maxLength={200}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`guest-email-${registrationId}`}>
                Email address
              </FieldLabel>
              <Input
                id={`guest-email-${registrationId}`}
                name="email"
                type="email"
                inputMode="email"
                defaultValue={email}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-fit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Save changes
          </Button>
        </form>

        {ticketCode ? (
          <div className="mt-6 flex flex-col gap-2 border-t pt-5">
            {canAdmit ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await checkInGuestAction(eventId, ticketCode);
                    const admitted = result.outcome === "accepted";
                    return {
                      ok: admitted,
                      message: admitted
                        ? `${name} is checked in.`
                        : outcomePresentation[result.outcome].title,
                    };
                  })
                }
              >
                <IconUserCheck data-icon="inline-start" />
                Check in by hand
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => resendGuestTicketAction(eventId, registrationId))
              }
            >
              <IconMailForward data-icon="inline-start" />
              Resend ticket
            </Button>
            {canAdmit ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="destructive" disabled={pending} />}
                >
                  <IconTicketOff data-icon="inline-start" />
                  Cancel registration
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel {name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Their ticket stops working and the place opens up. This
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep them</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive-solid"
                      onClick={() =>
                        run(() => cancelGuestAction(eventId, registrationId))
                      }
                    >
                      Cancel registration
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
