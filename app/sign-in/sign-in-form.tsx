"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui";
import { signInAction } from "./actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, {});

  if (!state.email) {
    return (
      <form action={action} className="grid gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" error={state.error}>
          <Input name="email" type="email" autoComplete="email" required autoFocus placeholder="you@example.com" />
        </Field>
        <SubmitButton pendingText="Sending code…">Email me a code</SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="email" value={state.email} />
      <p className="text-sm text-muted">
        We sent a 6-digit code to <strong className="text-fg">{state.email}</strong>.
      </p>
      <Field label="Code" error={state.error}>
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="text-center font-mono text-lg tracking-[0.4em]"
        />
      </Field>
      <SubmitButton pendingText="Checking…">Sign in</SubmitButton>
    </form>
  );
}
