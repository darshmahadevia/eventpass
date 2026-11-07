import { Badge } from "@/components/ui";
import type { Event } from "@/lib/db/schema";

export function StatusBadge({ event }: { event: Event }) {
  const now = new Date();
  if (event.status === "cancelled") return <Badge tone="danger">Cancelled</Badge>;
  if (event.status === "draft") return <Badge>Draft</Badge>;
  if (event.endsAt < now) return <Badge>Ended</Badge>;
  if (event.startsAt <= now) return <Badge tone="success" live>Doors open</Badge>;
  return <Badge tone="accent">Published</Badge>;
}
