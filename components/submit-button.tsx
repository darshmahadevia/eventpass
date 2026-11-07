"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

/** A submit button that disables itself while its form's action is running. */
export function SubmitButton({
  pendingText,
  confirm,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...props}
    >
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
