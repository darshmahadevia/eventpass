"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import type { FormField } from "@/lib/db/schema";
import { registerAction } from "./actions";

export function RegistrationForm({ slug, fields }: { slug: string; fields: FormField[] }) {
  const [state, action] = useActionState(registerAction.bind(null, slug), {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.sentTo) {
    return (
      <Notice tone="accent">
        <strong>{state.sentTo}</strong> is already registered. We&apos;ve emailed the ticket there again.
      </Notice>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      <Field label="Full name" error={e.name}>
        <Input name="name" defaultValue={v.name} autoComplete="name" required maxLength={120} />
      </Field>
      <Field label="Email" hint="Your ticket will be sent here." error={e.email}>
        <Input name="email" type="email" defaultValue={v.email} autoComplete="email" required />
      </Field>
      {fields.map((field) => {
        const name = `q_${field.id}`;
        const label = (
          <>
            {field.label}
            {!field.required && <span className="font-normal text-muted"> (optional)</span>}
          </>
        );
        if (field.type === "checkbox") {
          return (
            <div key={field.id} className="grid gap-1.5">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name={name}
                  value="yes"
                  defaultChecked={Boolean(v[name])}
                  required={field.required}
                  className="mt-0.5 size-4 accent-(--accent)"
                />
                <span className="font-medium">{label}</span>
              </label>
              {e[field.id] && <span className="text-sm text-danger">{e[field.id]}</span>}
            </div>
          );
        }
        return (
          <Field key={field.id} label={label} error={e[field.id]}>
            {field.type === "textarea" ? (
              <Textarea name={name} defaultValue={v[name]} required={field.required} maxLength={2000} rows={3} />
            ) : field.type === "select" ? (
              <Select name={name} defaultValue={v[name] ?? ""} required={field.required}>
                <option value="" disabled={field.required}>
                  Choose…
                </option>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            ) : (
              <Input name={name} defaultValue={v[name]} required={field.required} maxLength={2000} />
            )}
          </Field>
        );
      })}
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <SubmitButton pendingText="Registering…" className="h-12 text-base">
        Register
      </SubmitButton>
    </form>
  );
}
