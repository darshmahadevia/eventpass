import { EventPassMark } from "@/components/eventpass-mark";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Not found" };

/**
 * Reached by `notFound()` as well as unknown URLs, so the copy covers both an
 * Event the viewer cannot see and one that never existed. The distinction is
 * deliberately not disclosed: Published Events are unlisted, and confirming an
 * Event Slug exists would leak that.
 *
 * It wears the door's refusal colour because that is what it is. Home leads,
 * since most arrivals are holders of a mistyped public link with no staff
 * account.
 */
export default function NotFound() {
  return (
    <main className="poster-surface signal-surface flex min-h-svh flex-1 flex-col bg-poster-refused px-4 text-poster-ink sm:px-8">
      <header className="flex h-16 items-center">
        <EventPassMark />
      </header>
      <div className="flex flex-1 flex-col justify-center gap-6 pb-16">
        <h1 className="type-section text-[clamp(4.25rem,15vw,12rem)]! leading-none!">
          Wrong door.
        </h1>
        <p className="max-w-lg text-xl text-pretty">
          This link may be mistyped, the event may have been withdrawn, or it
          may not be shared with this account.
        </p>
        <div className="flex flex-wrap gap-3">
          <PendingLink
            href="/"
            className={buttonVariants({ size: "lg" })}
            pendingLabel="Opening home"
          >
            Go to EventPass
          </PendingLink>
          <PendingLink
            href="/events"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-poster-ink/50 bg-transparent hover:bg-poster-ink/10",
            )}
            pendingLabel="Opening events"
          >
            Open your events
          </PendingLink>
        </div>
      </div>
    </main>
  );
}
