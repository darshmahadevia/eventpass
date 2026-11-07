"use client";

import { useActionState } from "react";

import { requestTicketEmailAction } from "@/app/e/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/**
 * Just an email address, open until the event ends. A guest at the door who has
 * lost their ticket has no time to refill a form, and may be past the point
 * where registration closed.
 */
export function TicketRecoveryForm({ slug }: { slug: string }) {
  const [message, action, pending] = useActionState(
    requestTicketEmailAction.bind(null, slug),
    "",
  );

  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold underline underline-offset-4 md:min-h-8">
        Already registered? Get your ticket again
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="recovery-email">Your email address</FieldLabel>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </Field>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Sending…" : "Email my ticket"}
        </Button>
        <p role="status" className="text-sm text-muted-foreground empty:hidden">
          {message}
        </p>
      </form>
    </details>
  );
}
