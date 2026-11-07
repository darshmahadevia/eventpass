"use client";

import { useActionState } from "react";
import { RegistrationFields } from "@/components/registration-fields";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import type { FormField } from "@/lib/db/schema";
import type { RegisterState } from "./actions";

export function RegistrationForm({
  register,
  fields,
}: {
  register: (state: RegisterState, form: FormData) => Promise<RegisterState>;
  fields: FormField[];
}) {
  const [state, action] = useActionState(register, {});

  if (state.sentTo) {
    return (
      <Notice tone="accent">
        <strong>{state.sentTo}</strong> is already registered. We&apos;ve emailed the ticket there again.
      </Notice>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      <RegistrationFields fields={fields} values={state.values} errors={state.errors} />
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <SubmitButton pendingText="Registering…" size="lg" className="mt-1 w-full">
        Get my ticket
      </SubmitButton>
    </form>
  );
}
