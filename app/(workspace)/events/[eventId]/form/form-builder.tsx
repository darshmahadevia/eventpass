"use client";

import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import type { FormField } from "@/lib/db/schema";
import { saveFormAction, type FormState } from "../../actions";

type Draft = FormField & { optionsText: string };

const TYPE_LABELS: Record<FormField["type"], string> = {
  text: "Short answer",
  textarea: "Paragraph",
  select: "Multiple choice",
  checkbox: "Checkbox",
};

// Not crypto.randomUUID: that needs a secure context, and LAN testing over http is common.
const newId = () => `f_${Math.random().toString(36).slice(2, 10)}`;

export function FormBuilder({ eventId, initial }: { eventId: string; initial: FormField[] }) {
  const [fields, setFields] = useState<Draft[]>(() =>
    initial.map((f) => ({ ...f, optionsText: f.options.join("\n") })),
  );
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(async (prev: FormState, form: FormData) => {
    const next = await saveFormAction(eventId, prev, form);
    if (next.ok) setDirty(false);
    return next;
  }, {});

  const update = (next: Draft[]) => {
    setFields(next);
    setDirty(true);
  };
  const patch = (index: number, change: Partial<Draft>) =>
    update(fields.map((f, i) => (i === index ? { ...f, ...change } : f)));
  const move = (index: number, by: number) => {
    const next = [...fields];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + by, 0, item);
    update(next);
  };

  const payload = JSON.stringify(
    fields.map(({ optionsText, ...f }) => ({
      ...f,
      options: optionsText.split("\n").map((o) => o.trim()).filter(Boolean),
    })),
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="fields" value={payload} />

      <Card className="p-5 text-sm text-muted">
        Every registration asks for <strong className="text-fg">name</strong> and{" "}
        <strong className="text-fg">email</strong>. Add any other questions below.
      </Card>

      {fields.map((field, index) => (
        <Card key={field.id} className="grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Field label={`Question ${index + 1}`}>
              <Input value={field.label} onChange={(e) => patch(index, { label: e.target.value })} maxLength={200} required />
            </Field>
            <Field label="Type">
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
            <Field label="Options" hint="One per line.">
              <Textarea value={field.optionsText} onChange={(e) => patch(index, { optionsText: e.target.value })} rows={3} />
            </Field>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => patch(index, { required: e.target.checked })}
                className="size-4 accent-(--accent)"
              />
              Required
            </label>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" className="size-9 px-0" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                <IconArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="size-9 px-0" disabled={index === fields.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                <IconArrowDown className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="size-9 px-0 text-danger" onClick={() => update(fields.filter((_, i) => i !== index))} aria-label="Remove question">
                <IconTrash className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={fields.length >= 25}
          onClick={() => update([...fields, { id: newId(), label: "", type: "text", required: false, options: [], optionsText: "" }])}
        >
          <IconPlus className="size-4" /> Add question
        </Button>
      </div>

      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.ok && !dirty && <Notice tone="success">Form saved.</Notice>}

      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <span className="text-sm text-muted">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <SubmitButton disabled={!dirty} pendingText="Saving…">
          Save form
        </SubmitButton>
      </div>
    </form>
  );
}
