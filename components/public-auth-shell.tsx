import type { ReactNode } from "react";
import Link from "next/link";
import { EventPassMark } from "@/components/eventpass-mark";

// The wordmark goes home, as it does in the marketing and workspace headers.
function HomeMark() {
  return (
    <Link
      href="/"
      aria-label="EventPass home"
      className="w-fit rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <EventPassMark />
    </Link>
  );
}

export function PublicAuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <aside className="poster-surface signal-surface hidden bg-poster-confirmed p-10 text-poster-ink lg:flex lg:flex-col lg:justify-between xl:p-14">
        <HomeMark />

        <div className="flex flex-col gap-5">
          <h2 className="type-poster">Your next event starts here.</h2>
          <p className="max-w-sm text-lg text-pretty">
            Guest list, tickets, and door team in one place. No password to
            remember.
          </p>
        </div>

        <p className="text-sm">Built for university clubs running real doors.</p>
      </aside>

      <section className="flex min-h-svh flex-col">
        <header className="flex h-16 items-center px-4 sm:px-6 lg:hidden">
          <HomeMark />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
