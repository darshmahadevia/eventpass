import { VoidTicket } from "@/components/void-ticket";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <VoidTicket
      code="404"
      stamp="Not found"
      title="Nothing at this address"
      body="The link may be mistyped, or the event or ticket no longer exists. If someone sent it to you, ask them for a fresh one."
    >
      <ButtonLink href="/">Go to EventPass</ButtonLink>
      <ButtonLink href="/events" variant="secondary">
        Your events
      </ButtonLink>
    </VoidTicket>
  );
}
