"use client";

import { IconPlus } from "@tabler/icons-react";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { addGuestAction, type FormState } from "../../actions";

export function AddGuestForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: FormState, form: FormData) => {
    const next = await addGuestAction(eventId, prev, form);
    if (next.ok) setOpen(false);
    return next;
  }, {});

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <IconPlus className="size-4" /> Add guest
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Add a guest</h2>
        <p className="mt-1 mb-5 text-sm text-muted">They&apos;ll get their ticket by email. Capacity limits don&apos;t apply.</p>
        <form action={action} className="grid gap-4">
          <Field label="Name">
            <Input name="name" required autoFocus maxLength={120} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          {state.error && <Notice tone="danger">{state.error}</Notice>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <SubmitButton pendingText="Adding…">Add guest</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
