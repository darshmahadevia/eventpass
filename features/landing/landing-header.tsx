"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { EventPassMark } from "@/components/eventpass-mark";
import { PendingLink } from "@/components/pending-link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "#door", label: "At the door" },
  { href: "#count", label: "The count" },
  { href: "#ticket", label: "The ticket" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#questions", label: "Questions" },
];

// Sits on the stage with no surface of its own, then becomes ordinary chrome
// once the stage has gone: a coloured bar following the reader down the page
// would be colour reporting nothing.
export function LandingHeader() {
  const [overStage, setOverStage] = useState(true);

  useEffect(() => {
    const stage = document.getElementById("door-stage");
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOverStage(entry?.isIntersecting ?? true),
      { rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-18 border-b transition-[background-color,border-color] duration-(--duration-fast)",
        overStage
          ? "poster-surface signal-surface border-transparent bg-transparent text-poster-ink"
          : "bg-background text-foreground",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[120rem] items-center gap-8 px-4 sm:px-8">
        <Link href="/" aria-label="EventPass home" className="rounded-md">
          <EventPassMark />
        </Link>
        <nav
          aria-label="Sections"
          className={cn(
            "hidden items-center gap-6 text-sm lg:flex",
            !overStage && "text-muted-foreground",
          )}
        >
          {SECTIONS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitcher />
          <PendingLink
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 bg-transparent px-4",
              overStage && "border-poster-ink/50 hover:bg-poster-ink/10",
            )}
            pendingLabel="Opening sign in"
          >
            Sign in
          </PendingLink>
        </div>
      </div>
    </header>
  );
}
