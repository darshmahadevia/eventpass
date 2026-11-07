"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui";
import type { FormState } from "../../actions";

export function AddStaffForm({ addStaff }: { addStaff: (state: FormState, form: FormData) => Promise<FormState> }) {
  const [state, action] = useActionState(addStaff, {});
  return (
    <form action={action} className="grid gap-2">
      <div className="flex gap-2">
        <Input name="email" type="email" required placeholder="volunteer@example.com" aria-label="Staff email" />
        <SubmitButton variant="secondary" pendingText="Adding…">
          Add
        </SubmitButton>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
