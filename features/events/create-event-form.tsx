"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconChevronRight,
  IconLock,
  IconPlus,
} from "@tabler/icons-react";

import { createEventAction } from "@/app/(workspace)/events/new/actions";
import {
  initialCreateEventFormState,
  type CreateEventFormField,
  type CreateEventFormState,
} from "@/app/(workspace)/events/new/form-state";
import { updateEventAction } from "@/app/(workspace)/events/[eventId]/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PendingLink } from "@/components/pending-link";
import { useLeaveGuard } from "@/components/use-leave-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import timeZones from "@/lib/time-zones.json";

function EventField({
  children,
  description,
  field,
  label,
  state,
  edited,
}: {
  children: React.ReactNode;
  description?: string;
  field: CreateEventFormField;
  label: string;
  state: CreateEventFormState;
  edited: ReadonlySet<string>;
}) {
  // A complaint about a field disappears as soon as it is being fixed.
  const errors = edited.has(field) ? undefined : state.fieldErrors?.[field];

  return (
    <Field data-invalid={Boolean(errors?.length)}>
      <FieldLabel htmlFor={field}>{label}</FieldLabel>
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}

function value(state: CreateEventFormState, field: CreateEventFormField) {
  return state.values?.[field];
}

/** "Founders' Breakfast 2026" becomes `founders-breakfast-2026`. */
function slugFromName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

const subscribeToNothing = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function CreateEventForm({
  eventId,
  initialValues,
  slugImmutable = false,
  lock = "none",
}: {
  eventId?: string;
  initialValues?: Record<CreateEventFormField, string>;
  slugImmutable?: boolean;
  /**
   * Once check-in opens the event can only get longer, and only its owner can
   * do that. Stating that up front beats letting someone edit a field, press
   * Save, and be refused.
   */
  lock?: "none" | "extend-only" | "all";
} = {}) {
  const action = eventId
    ? updateEventAction.bind(null, eventId)
    : createEventAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialValues
      ? { ...initialCreateEventFormState, values: initialValues }
      : initialCreateEventFormState,
  );
  const isEditing = Boolean(eventId);
  const locked = lock !== "none";
  const endLocked = lock === "all";
  const formRef = useRef<HTMLFormElement>(null);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  useLeaveGuard(dirty && !isPending);
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  // The address follows the name until the organizer edits it themselves.
  const [slugEdited, setSlugEdited] = useState(Boolean(initialValues?.slug));
  // A new event starts in the organizer's own zone: the wrong default silently
  // shifts every time on the event by hours. Read through a store so the server
  // render and hydration agree.
  const detectedTimeZone = useSyncExternalStore(
    subscribeToNothing,
    browserTimeZone,
    () => "",
  );
  const [chosenTimeZone, setChosenTimeZone] = useState<string | null>(null);
  const selectedTimeZone =
    chosenTimeZone || value(state, "eventTimeZone") || detectedTimeZone || "UTC";
  const availableTimeZones = timeZones.includes(selectedTimeZone)
    ? timeZones
    : [selectedTimeZone, ...timeZones];

  const isInvalid = (field: CreateEventFormField) =>
    !edited.has(field) && Boolean(state.fieldErrors?.[field]);

  // Errors come back from the server, so focus has to be taken to the first one
  // or a keyboard or screen-reader user is left at the submit button.
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  // Submitted by hand because React resets a form after its `action` runs. That
  // reset put the time zone select back on its first option, so fixing another
  // field and saving again quietly moved the event to the wrong zone.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setEdited(new Set());
    startTransition(() => formAction(formData));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submit}
      onInput={(event) => {
        const { name } = event.target as HTMLInputElement;
        setDirty(true);
        if (name) setEdited((current) => new Set(current).add(name));
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      {locked ? (
        <Alert variant="warning">
          <IconLock aria-hidden="true" />
          <AlertTitle>Check-in is open, so most details are locked</AlertTitle>
          <AlertDescription>
            {lock === "extend-only"
              ? "You can still extend the end time and when check-in closes."
              : "Only the event owner can extend the end time."}
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <IconAlertCircle aria-hidden="true" />
          <AlertTitle>Event not saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <FieldSet className="panel p-5 sm:p-6">
          <FieldLegend>Event details</FieldLegend>
          <FieldDescription>
            What guests see on the public page and on their ticket.
          </FieldDescription>
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <EventField field="name" label="Event name" state={state} edited={edited}>
              <Input
                id="name"
                name="name"
                readOnly={locked}
                autoComplete="off"
                defaultValue={value(state, "name")}
                aria-invalid={isInvalid("name")}
                placeholder="Annual engineering showcase"
                maxLength={160}
                required
                disabled={isPending}
                onChange={(event) => {
                  if (!slugEdited && !slugImmutable) {
                    setSlug(slugFromName(event.target.value));
                  }
                }}
              />
            </EventField>
            <EventField
              field="slug"
              label="Web address"
              state={state}
              edited={edited}
              description={slugImmutable ? "Fixed now that the event is published, so shared links keep working." : "Filled in from the name. You can change it until you publish."}
            >
              <Input
                id="slug"
                name="slug"
                autoComplete="off"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugEdited(true);
                }}
                aria-invalid={isInvalid("slug")}
                placeholder="your-event"
                minLength={3}
                maxLength={80}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                readOnly={slugImmutable}
                disabled={isPending}
              />
              <p className="text-sm break-all text-muted-foreground">
                {process.env.NEXT_PUBLIC_APP_URL}/e/{slug || "your-event"}
              </p>
            </EventField>
            <div className="sm:col-span-2">
            <EventField field="description" label="Description" state={state} edited={edited}>
              <Textarea
                id="description"
                name="description"
                readOnly={locked}
                defaultValue={value(state, "description")}
                aria-invalid={isInvalid("description")}
                placeholder="Tell guests what to expect."
                maxLength={4000}
                rows={5}
                required
                disabled={isPending}
                className="min-h-28"
              />
            </EventField>
            </div>
            <div className="sm:col-span-2">
            <EventField
              field="eventTimeZone"
              label="Time zone"
              state={state}
              edited={edited}
              description="Every time on this event uses this zone, wherever guests are."
            >
              <select
                className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base outline-none hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50 md:h-10 md:text-sm"
                id="eventTimeZone"
                name="eventTimeZone"
                value={selectedTimeZone}
                onChange={(event) => setChosenTimeZone(event.target.value)}
                aria-invalid={isInvalid("eventTimeZone")}
                required
                disabled={isPending || locked}
              >
                {[...availableTimeZones]
                  .sort((a, b) =>
                    (a.split("/").at(-1) ?? a).localeCompare(
                      b.split("/").at(-1) ?? b,
                    ),
                  )
                  .map((timeZone) => (
                    <option key={timeZone} value={timeZone}>
                      {timeZone
                        .split("/")
                        .reverse()
                        .join(", ")
                        .replaceAll("_", " ")}
                    </option>
                  ))}
              </select>
              {locked ? (
                <input
                  type="hidden"
                  name="eventTimeZone"
                  value={selectedTimeZone}
                />
              ) : null}
            </EventField>
            </div>
            <EventField field="startsAtLocal" label="Starts" state={state} edited={edited}>
              <Input
                id="startsAtLocal"
                name="startsAtLocal"
                readOnly={locked}
                type="datetime-local"
                defaultValue={value(state, "startsAtLocal")}
                aria-invalid={isInvalid("startsAtLocal")}
                required
                disabled={isPending}
              />
            </EventField>
            <EventField field="endsAtLocal" label="Ends" state={state} edited={edited}>
              <Input
                id="endsAtLocal"
                name="endsAtLocal"
                readOnly={endLocked}
                type="datetime-local"
                defaultValue={value(state, "endsAtLocal")}
                aria-invalid={isInvalid("endsAtLocal")}
                required
                disabled={isPending}
              />
            </EventField>
          </FieldGroup>
        </FieldSet>

        <FieldSet className="panel p-5 sm:p-6">
          <FieldLegend>Venue and capacity</FieldLegend>
          <FieldDescription>
            Where it happens, and how many people can come. Once it is full,
            new guests join a waitlist.
          </FieldDescription>
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <EventField field="venueName" label="Venue name" state={state} edited={edited}>
              <Input
                id="venueName"
                name="venueName"
                readOnly={locked}
                defaultValue={value(state, "venueName")}
                aria-invalid={isInvalid("venueName")}
                placeholder="Main auditorium"
                maxLength={160}
                required
                disabled={isPending}
              />
            </EventField>
            <EventField
              field="capacity"
              label="Capacity"
              state={state}
              edited={edited}
              description="Between 1 and 3,000 attendees."
            >
              <Input
                id="capacity"
                name="capacity"
                readOnly={locked}
                type="number"
                inputMode="numeric"
                min={1}
                max={3_000}
                defaultValue={value(state, "capacity")}
                aria-invalid={isInvalid("capacity")}
                placeholder="250"
                required
                disabled={isPending}
              />
            </EventField>
            <EventField
              field="venueAddress"
              label="Address"
              state={state}
              edited={edited}
            >
              <Input
                id="venueAddress"
                name="venueAddress"
                readOnly={locked}
                defaultValue={value(state, "venueAddress")}
                aria-invalid={isInvalid("venueAddress")}
                placeholder="Street, city, region"
                maxLength={500}
                required
                disabled={isPending}
              />
            </EventField>
            <EventField
              field="venueMapUrl"
              label="Map link (optional)"
              state={state}
              edited={edited}
              description="Paste a link from your maps app."
            >
              <Input
                id="venueMapUrl"
                name="venueMapUrl"
                readOnly={locked}
                type="url"
                inputMode="url"
                defaultValue={value(state, "venueMapUrl")}
                aria-invalid={isInvalid("venueMapUrl")}
                placeholder="https://"
                disabled={isPending}
              />
            </EventField>
          </FieldGroup>
        </FieldSet>

        <details
          className="group panel p-5 sm:p-6"
          onInvalidCapture={(event) => {
            event.currentTarget.open = true;
          }}
          open={
            isEditing ||
            Boolean(
              state.fieldErrors?.registrationOpensAtLocal ||
              state.fieldErrors?.registrationClosesAtLocal ||
              state.fieldErrors?.checkInOpensAtLocal ||
              state.fieldErrors?.checkInClosesAtLocal,
            )
          }
        >
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md text-lg font-headline outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
            <IconChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 transition-transform group-open:rotate-90"
            />
            Registration and check-in times
          </summary>
          <FieldSet className="mt-4">
            <FieldLegend variant="label" className="sr-only">
              Registration and check-in times
            </FieldLegend>
            <FieldDescription>
              Leave these blank and registration opens now and closes when the
              event starts. Check-in opens an hour before and closes when the
              event ends.
            </FieldDescription>
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              <EventField
                field="registrationOpensAtLocal"
                label="Registration opens"
                state={state}
              edited={edited}
              >
                <Input
                  id="registrationOpensAtLocal"
                  name="registrationOpensAtLocal"
                readOnly={locked}
                  type="datetime-local"
                  defaultValue={value(state, "registrationOpensAtLocal")}
                  aria-invalid={isInvalid("registrationOpensAtLocal")}
                  disabled={isPending}
                />
              </EventField>
              <EventField
                field="registrationClosesAtLocal"
                label="Registration closes"
                state={state}
              edited={edited}
              >
                <Input
                  id="registrationClosesAtLocal"
                  name="registrationClosesAtLocal"
                readOnly={locked}
                  type="datetime-local"
                  defaultValue={value(state, "registrationClosesAtLocal")}
                  aria-invalid={isInvalid("registrationClosesAtLocal")}
                  disabled={isPending}
                />
              </EventField>
              <EventField
                field="checkInOpensAtLocal"
                label="Check-in opens"
                state={state}
              edited={edited}
              >
                <Input
                  id="checkInOpensAtLocal"
                  name="checkInOpensAtLocal"
                readOnly={locked}
                  type="datetime-local"
                  defaultValue={value(state, "checkInOpensAtLocal")}
                  aria-invalid={isInvalid("checkInOpensAtLocal")}
                  disabled={isPending}
                />
              </EventField>
              <EventField
                field="checkInClosesAtLocal"
                label="Check-in closes"
                state={state}
              edited={edited}
              >
                <Input
                  id="checkInClosesAtLocal"
                  name="checkInClosesAtLocal"
                readOnly={endLocked}
                  type="datetime-local"
                  defaultValue={value(state, "checkInClosesAtLocal")}
                  aria-invalid={isInvalid("checkInClosesAtLocal")}
                  disabled={isPending}
                />
              </EventField>
            </FieldGroup>
          </FieldSet>
        </details>
      </FieldGroup>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <PendingLink
          href={eventId ? `/events/${eventId}` : "/events"}
          className={buttonVariants({ variant: "outline", size: "lg" })}
          pendingLabel="Canceling"
        >
          Cancel
        </PendingLink>
        {lock === "all" ? null : (
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" />
              {isEditing
                ? "Saving…"
                : "Creating draft…"}
            </>
          ) : (
            <>
              {isEditing ? (
                <IconCheck data-icon="inline-start" />
              ) : (
                <IconPlus data-icon="inline-start" />
              )}
              {isEditing ? "Save changes" : "Create draft"}
            </>
          )}
        </Button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {isPending
          ? isEditing
            ? "Saving your changes."
            : "Creating the draft and assigning you as owner."
          : ""}
      </p>
    </form>
  );
}
