"use client";

import { IconLoader2 } from "@tabler/icons-react";
import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Modal, type ModalHandle } from "@/components/client";
import { Button } from "@/components/ui";

type Props = React.ComponentProps<typeof Button> & {
  pendingText?: string;
  /** Asks first. The text explains what will happen; `confirmLabel` names the action. */
  confirm?: string;
  confirmTitle?: string;
  confirmLabel?: string;
};

/** A submit button that shows progress while its form's action runs. */
export function SubmitButton({ pendingText, confirm, confirmTitle, confirmLabel, children, ...props }: Props) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  const modal = useRef<ModalHandle>(null);

  return (
    <>
      <Button
        ref={button}
        type="submit"
        {...props}
        disabled={pending || props.disabled}
        aria-busy={pending}
        onClick={(e) => {
          if (confirm) {
            e.preventDefault();
            modal.current?.open();
          }
        }}
      >
        {pending ? <IconLoader2 aria-hidden className="size-4 animate-spin" /> : null}
        {pending && pendingText ? pendingText : children}
      </Button>
      {confirm && (
        <Modal ref={modal} title={confirmTitle ?? "Are you sure?"}>
          <p className="text-muted">{confirm}</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" autoFocus onClick={() => modal.current?.close()}>
              Go back
            </Button>
            <Button
              type="button"
              className="bg-danger text-on-danger hover:brightness-105"
              onClick={() => {
                modal.current?.close();
                button.current?.form?.requestSubmit();
              }}
            >
              {confirmLabel ?? "Confirm"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
