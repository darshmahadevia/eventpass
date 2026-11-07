"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui";
import { addStaffAction } from "../../actions";

export function AddStaffForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(addStaffAction.bind(null, eventId), {});
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
