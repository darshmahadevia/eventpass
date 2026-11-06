import { IconTicket } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export function EventPassMark({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* The product's yes. On a surface already that colour, a stage or a door
          decision, `poster-surface` turns the tile to ink. */}
      <span
        data-slot="mark-tile"
        className="flex size-9 items-center justify-center rounded-md bg-poster-confirmed text-poster-ink"
      >
        <IconTicket aria-hidden="true" className="size-5" />
      </span>
      <span className={cn("text-lg font-headline", wordmarkClassName)}>EventPass</span>
    </div>
  );
}
