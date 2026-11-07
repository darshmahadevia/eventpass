"use client";

import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { RegistrationFields } from "@/components/registration-fields";
import { Button, Card, Field, Input, Notice, Select, Switch, Textarea } from "@/components/ui";
import type { FormField } from "@/lib/db/schema";
import type { FormState } from "../../actions";

type Draft = FormField & { optionsText: string };

const TYPE_LABELS: Record<FormField["type"], string> = {
  text: "Short answer",
  textarea: "Paragraph",
  select: "Multiple choice",
  checkbox: "Checkbox",
};

const toDrafts = (fields: FormField[]): Draft[] =>
  fields.map((f) => ({ ...f, optionsText: f.options.join("\n") }));

const toFields = (fields: Draft[]): FormField[] =>
  fields.map(({ optionsText, ...f }) => ({
    ...f,
    options: f.type === "select" ? optionsText.split("\n").map((o) => o.trim()).filter(Boolean) : [],
  }));

const serialize = (fields: Draft[]) => JSON.stringify(toFields(fields));

// Not crypto.randomUUID: that needs a secure context, and LAN testing over http is common.
const newId = () => `f_${Math.random().toString(36).slice(2, 10)}`;

export function FormBuilder({
  saveForm,
  initial,
}: {
  saveForm: (state: FormState, form: FormData) => Promise<FormState>;
  initial: FormField[];
}) {
  const [fields, update] = useState(() => toDrafts(initial));
  const [state, action] = useActionState(saveForm, {});
  const patch = (index: number, change: Partial<Draft>) =>
    update(fields.map((f, i) => (i === index ? { ...f, ...change } : f)));
  const move = (index: number, by: number) => {
    const next = [...fields];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + by, 0, item);
    update(next);
  };

  const payload = serialize(fields);
  // Dirty means "differs from what the server last saved".
  const dirty = payload !== (state.values?.fields ?? serialize(toDrafts(initial)));

  return (
    <form action={action} className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
      <input type="hidden" name="fields" value={payload} />

      <div className="grid gap-3">
        <div className="mb-3">
          <h2 className="text-lg font-bold">Questions</h2>
          <p className="mt-1 text-sm text-muted">
            Every guest gives their <strong className="font-semibold text-fg">name</strong> and{" "}
            <strong className="font-semibold text-fg">email</strong>. Ask anything else here.
          </p>
        </div>

        {fields.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center text-sm text-muted">
            No extra questions. Registration takes a few seconds.
          </div>
        )}

        {fields.map((field, index) => (
          <Card key={field.id} className="grid gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold tracking-[0.08em] text-faint uppercase">Question {index + 1}</span>
              <div className="-my-1.5 -mr-2 flex">
                <IconButton label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                  <IconArrowUp className="size-4" />
                </IconButton>
                <IconButton label="Move down" disabled={index === fields.length - 1} onClick={() => move(index, 1)}>
                  <IconArrowDown className="size-4" />
                </IconButton>
                <IconButton
                  label="Remove question"
                  className="hover:bg-danger-soft hover:text-danger"
                  onClick={() => update(fields.filter((_, i) => i !== index))}
                >
                  <IconTrash className="size-4" />
                </IconButton>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <Field label="Question">
                <Input
                  value={field.label}
                  onChange={(e) => patch(index, { label: e.target.value })}
                  maxLength={200}
                  required
                  autoFocus={!field.label && index === fields.length - 1}
                  placeholder="Dietary needs?"
                />
              </Field>
              <Field label="Answer type">
                <Select value={field.type} onChange={(e) => patch(index, { type: e.target.value as FormField["type"] })}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {field.type === "select" && (
              <Field label="Choices" hint="One per line.">
                <Textarea
                  value={field.optionsText}
                  onChange={(e) => patch(index, { optionsText: e.target.value })}
                  rows={3}
                  placeholder={"Vegetarian\nVegan\nNo preference"}
                />
              </Field>
            )}
            <label className="flex w-fit items-center gap-3 text-sm font-medium">
              <Switch checked={field.required} onChange={(e) => patch(index, { required: e.target.checked })} />
              Required
            </label>
          </Card>
        ))}

        <Button
          type="button"
          variant="secondary"
          className="h-14 border-dashed"
          disabled={fields.length >= 25}
          onClick={() => update([...fields, { id: newId(), label: "", type: "text", required: false, options: [], optionsText: "" }])}
        >
          <IconPlus aria-hidden className="size-4" stroke={2.4} /> Add a question
        </Button>
      </div>

      <aside aria-label="Preview" className="grid gap-3 lg:sticky lg:top-24">
        <h2 className="text-xs font-bold tracking-[0.08em] text-faint uppercase">What guests see</h2>
        <div className="rounded-3xl border border-line p-5 sm:p-6">
          <div inert className="grid gap-5">
            <RegistrationFields fields={toFields(fields)} />
            <Button type="button" size="lg" className="w-full">
              Get my ticket
            </Button>
          </div>
        </div>
      </aside>

      <div className="sticky bottom-4 z-10 lg:col-span-2">
        {state.error && <Notice tone="danger" className="mb-3">{state.error}</Notice>}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface/90 py-2.5 pr-2.5 pl-5 shadow-[0_12px_40px_rgb(0_0_0/0.25)] backdrop-blur-xl">
          <span className="flex items-center gap-2 text-sm font-medium text-muted" aria-live="polite">
            <span aria-hidden className={dirty ? "size-2 rounded-full bg-warning" : "size-2 rounded-full bg-success"} />
            {dirty ? "Unsaved changes" : state.ok ? "Saved" : "All changes saved"}
          </span>
          <SubmitButton disabled={!dirty} pendingText="Saving…">
            Save form
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

function IconButton({ label, className, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg disabled:pointer-events-none disabled:opacity-30 ${className ?? ""}`}
      {...props}
    />
  );
}
