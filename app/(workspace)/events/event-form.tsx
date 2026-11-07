"use client";

import { useActionState, useSyncExternalStore } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import type { FormState } from "./actions";

const TIME_ZONES = Intl.supportedValuesOf("timeZone");
const noop = () => () => {};

export type EventFormValues = {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  capacity: string;
};

export function EventForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  initial?: EventFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  // New events default to the organizer's own zone, which only the browser knows.
  const browserZone = useSyncExternalStore(
    noop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-10">
      <Group title="What and where">
        <Field label="Event name" error={e.title}>
          <Input
            name="title"
            defaultValue={v.title}
            required
            maxLength={120}
            placeholder="Spring Product Meetup"
            aria-invalid={!!e.title}
          />
        </Field>
        <Field label="Description" hint="Shown on the registration page. Line breaks are kept.">
          <Textarea name="description" defaultValue={v.description} rows={5} maxLength={5000} />
        </Field>
        <Field label="Location">
          <Input name="location" defaultValue={v.location} maxLength={300} placeholder="Venue name and address" />
        </Field>
      </Group>

      <Group title="When">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts" error={e.startsAt}>
            <Input name="startsAt" type="datetime-local" defaultValue={v.startsAt} required aria-invalid={!!e.startsAt} />
          </Field>
          <Field label="Ends" error={e.endsAt}>
            <Input name="endsAt" type="datetime-local" defaultValue={v.endsAt} required aria-invalid={!!e.endsAt} />
          </Field>
        </div>
        <Field label="Time zone" hint="Times on tickets and emails are shown in this zone." error={e.timeZone}>
          <Select key={browserZone} name="timeZone" defaultValue={v.timeZone ?? browserZone}>
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      </Group>

      <Group title="Capacity">
        <Field label="Spots" hint="Registration closes when this many people sign up. Leave empty for no limit." error={e.capacity}>
          <Input
            name="capacity"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={v.capacity}
            placeholder="No limit"
            className="sm:max-w-48"
            aria-invalid={!!e.capacity}
          />
        </Field>
      </Group>

      <div className="grid gap-4 border-t border-line pt-6">
        {state.error && <Notice tone="danger">{state.error}</Notice>}
        {state.ok && <Notice tone="success">Changes saved.</Notice>}
        <div>
          <SubmitButton size="lg" pendingText="Saving…">
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5">
      <legend className="mb-5 text-xs font-bold tracking-[0.08em] text-faint uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}
