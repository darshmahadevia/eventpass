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
    <form action={formAction} className="grid gap-5">
      <Field label="Event name" error={e.title}>
        <Input name="title" defaultValue={v.title} required maxLength={120} placeholder="Spring Product Meetup" />
      </Field>
      <Field label="Description" hint="Shown on the public registration page.">
        <Textarea name="description" defaultValue={v.description} rows={4} maxLength={5000} />
      </Field>
      <Field label="Location">
        <Input name="location" defaultValue={v.location} maxLength={300} placeholder="Venue name and address" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts" error={e.startsAt}>
          <Input name="startsAt" type="datetime-local" defaultValue={v.startsAt} required />
        </Field>
        <Field label="Ends" error={e.endsAt}>
          <Input name="endsAt" type="datetime-local" defaultValue={v.endsAt} required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time zone" error={e.timeZone}>
          <Select key={browserZone} name="timeZone" defaultValue={v.timeZone ?? browserZone}>
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacity" hint="Leave empty for no limit." error={e.capacity}>
          <Input name="capacity" type="number" min={1} defaultValue={v.capacity} placeholder="Unlimited" />
        </Field>
      </div>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.ok && <Notice tone="success">Saved.</Notice>}
      <div>
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
