"use client";

import { IconRefresh } from "@tabler/icons-react";
import { VoidTicket } from "@/components/void-ticket";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <VoidTicket
      code="Oops"
      stamp="Misprint"
      title="Something went wrong"
      body="That didn't load. Try again, and if it keeps happening, reload the page."
    >
      <Button onClick={reset}>
        <IconRefresh aria-hidden className="size-4" /> Try again
      </Button>
      <ButtonLink href="/" variant="secondary">
        Go home
      </ButtonLink>
    </VoidTicket>
  );
}
