"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IconAlertCircle, IconUserPlus } from "@tabler/icons-react";

import {
  AlertDialog,
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
import { Spinner } from "@/components/ui/spinner";
import { parseRegistrationImportPreview } from "./registration-import-preview";

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export type AddGuestQuestion = {
  id: string;
  label: string;
  answerType: string;
  choices: { id: string; label: string }[];
};

function GuestQuestion({ question }: { question: AddGuestQuestion }) {
  const name = `question-${question.id}`;
  if (question.answerType === "acknowledgment") {
    return (
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          name={name}
          value="yes"
          className="mt-0.5 size-4 accent-foreground"
        />
        {question.label}
      </label>
    );
  }
  if (question.choices.length > 0) {
    const multiple = question.answerType === "multiple_choice";
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{question.label}</legend>
        {question.choices.map((choice) => (
          <label key={choice.id} className="flex min-h-9 items-center gap-3 text-sm">
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={choice.label}
              className="size-4 accent-foreground"
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <Field>
      <FieldLabel htmlFor={name}>{question.label}</FieldLabel>
      <Input id={name} name={name} autoComplete="off" maxLength={500} />
    </Field>
  );
}

async function responseMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
    ? body.message
    : fallback;
}

/**
 * One guest, for the walk-up at the door or the name someone forgot. It is the
 * guest list import with a single row, so every capacity and duplicate rule is
 * the same one, and the guest gets a ticket by email like anyone imported.
 */
export function AddGuestDialog({
  eventId,
  requiredQuestions,
  className,
}: {
  eventId: string;
  /** The import needs these answered too, so they have to be asked here. */
  requiredQuestions: AddGuestQuestion[];
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (!name || !email) {
      setError("Enter the guest's name and email.");
      return;
    }

    setPending(true);
    setError(null);
    const base = `/api/events/${encodeURIComponent(eventId)}/registrations/import`;
    try {
      const upload = new FormData();
      upload.set(
        "file",
        new File(
          [
            `${["name", "email", ...requiredQuestions.map((question) => question.label)].map(csvCell).join(",")}\n`,
            `${[
              name,
              email,
              ...requiredQuestions.map((question) =>
                form.getAll(`question-${question.id}`).join(";"),
              ),
            ]
              .map(csvCell)
              .join(",")}\n`,
          ],
          "guest.csv",
          { type: "text/csv" },
        ),
      );
      const previewResponse = await fetch(`${base}/preview`, {
        method: "POST",
        body: upload,
      });
      if (!previewResponse.ok) {
        throw new Error(
          await responseMessage(previewResponse, "That guest could not be added."),
        );
      }
      const preview = parseRegistrationImportPreview(await previewResponse.json());
      const problem = preview.rows.flatMap((row) => row.errors)[0];
      if (problem || !preview.canConfirm) {
        throw new Error(problem ?? "That guest could not be added.");
      }
      const confirmResponse = await fetch(`${base}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: preview.id }),
      });
      if (!confirmResponse.ok) {
        // The import's own wording talks about a preview this dialog never showed.
        throw new Error(
          confirmResponse.status === 409
            ? "No place is free right now. Guests on the waitlist are offered places first."
            : "That guest could not be added. Try again.",
        );
      }
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "That guest could not be added.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger render={<Button className={className} />}>
        <IconUserPlus data-icon="inline-start" />
        Add guest
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90svh] overflow-y-auto">
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a guest</AlertDialogTitle>
            <AlertDialogDescription>
              They are confirmed straight away and get their ticket by email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="add-guest-name">Name</FieldLabel>
              <Input
                id="add-guest-name"
                name="name"
                autoComplete="off"
                maxLength={200}
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-guest-email">Email address</FieldLabel>
              <Input
                id="add-guest-email"
                name="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </Field>
            {requiredQuestions.map((question) => (
              <GuestQuestion key={question.id} question={question} />
            ))}
          </FieldGroup>
          {error ? (
            <Alert variant="destructive">
              <IconAlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Adding…" : "Add guest"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
