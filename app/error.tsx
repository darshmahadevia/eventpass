"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted">Please try again. If it keeps happening, reload the page.</p>
        <Button onClick={reset} variant="secondary" className="mt-6">
          Try again
        </Button>
      </div>
    </main>
  );
}
