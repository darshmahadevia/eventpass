// Roll tickets come in coloured stock so a door can tell one night's tickets from
// another's at a glance. Every event gets its own the same way.
export const STOCKS = ["marigold", "rose", "mint", "sky", "lilac"] as const;
export type Stock = (typeof STOCKS)[number];

export function stockFor(eventId: string): Stock {
  let hash = 0;
  for (const char of eventId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return STOCKS[hash % STOCKS.length]!;
}

/** Long titles step down so a poster headline never runs away. */
export function posterSize(title: string) {
  if (title.length <= 22) return "text-[clamp(3rem,6vw,6rem)]";
  if (title.length <= 44) return "text-[clamp(2.5rem,4.6vw,4.5rem)]";
  if (title.length <= 80) return "text-[clamp(2rem,3.6vw,3.5rem)]";
  return "text-[clamp(1.75rem,2.8vw,2.75rem)]";
}
