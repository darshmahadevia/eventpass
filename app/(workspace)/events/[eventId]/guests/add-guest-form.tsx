"use client";

import { IconPlus } from "@tabler/icons-react";
import { useActionState, useRef } from "react";
import { Modal, type ModalHandle } from "@/components/client";
import { SubmitButton } from "@/components/submit-button";
import { Button, Field, Input, Notice } from "@/components/ui";
import type { FormState } from "../../actions";

// Actions are bound on the server: binding inside a client component hangs
// Next's no-JS (pre-hydration) form submission path.
export function AddGuestForm({ addGuest }: { addGuest: (state: FormState, form: FormData) => Promise<FormState> }) {
  const [state, action] = useActionState(addGuest, {});
  const modal = useRef<ModalHandle>(null);
  return (
    <>
      <Button type="button" onClick={() => modal.current?.open()}>
        <IconPlus aria-hidden className="size-4" stroke={2.4} /> Add guest
      </Button>
      <Modal ref={modal} title="Add a guest">
        <p className="mb-5 text-muted">They&apos;ll get a ticket by email. Capacity limits don&apos;t apply.</p>
        {/* Keyed on success so the fields clear for the next guest. */}
        <form key={state.ok ? state.values?.email : "form"} action={action} className="grid gap-4">
          <Field label="Name">
            <Input name="name" required maxLength={120} autoComplete="off" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required autoComplete="off" />
          </Field>
          {state.error && <Notice tone="danger">{state.error}</Notice>}
          {state.ok && <Notice tone="success">Added. Their ticket is on its way.</Notice>}
          <SubmitButton pendingText="Adding…" className="mt-1">
            Add guest
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
