"use client";

import { IconPlus } from "@tabler/icons-react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, Field, Input, Notice } from "@/components/ui";
import type { FormState } from "../../actions";

// Actions are bound on the server: binding inside a client component hangs
// Next's no-JS (pre-hydration) form submission path.
export function AddGuestForm({ addGuest }: { addGuest: (state: FormState, form: FormData) => Promise<FormState> }) {
  const [state, action] = useActionState(addGuest, {});
  return (
    <details className="group relative">
      <summary className={buttonClass("primary", "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
        <IconPlus className="size-4" /> Add guest
      </summary>
      <Card className="absolute right-0 z-10 mt-2 w-[min(22rem,calc(100vw-2rem))] p-5 shadow-xl">
        <p className="mb-4 text-sm text-muted">They&apos;ll get their ticket by email. Capacity limits don&apos;t apply.</p>
        <form action={action} className="grid gap-4">
          <Field label="Name">
            <Input name="name" required maxLength={120} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          {state.error && <Notice tone="danger">{state.error}</Notice>}
          {state.ok && <Notice tone="success">Guest added.</Notice>}
          <SubmitButton pendingText="Adding…">Add guest</SubmitButton>
        </form>
      </Card>
    </details>
  );
}
