import { Badge } from "@/components/ui";
import type { Event } from "@/lib/db/schema";

export function StatusBadge({ event }: { event: Event }) {
  if (event.status === "cancelled") return <Badge tone="danger">Cancelled</Badge>;
  if (event.status === "draft") return <Badge>Draft</Badge>;
  if (event.endsAt < new Date()) return <Badge>Ended</Badge>;
  return <Badge tone="success">Live</Badge>;
}
