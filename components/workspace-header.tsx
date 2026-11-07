"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountMenu } from "@/components/account-menu";
import { EventPassMark } from "@/components/eventpass-mark";
import { PendingLink } from "@/components/pending-link";
import { cn } from "@/lib/utils";

/**
 * The signed-in chrome, shared by the event workspace and the administration
 * surface. Active state follows the pathname.
 *
 * Sticky from `lg` only. On a phone this scrolls away, so the one bar that
 * stays pinned is the event bar and the screen keeps its height for content.
 */
export function WorkspaceHeader({
  email,
  name,
  signOutAction,
  showAdmin,
}: {
  email: string;
  name?: string | null;
  signOutAction: () => void | Promise<void>;
  showAdmin: boolean;
}) {
  const pathname = usePathname();
  const links = [
    {
      href: "/events",
      label: "Events",
      active: pathname.startsWith("/events"),
    },
    ...(showAdmin
      ? [
          {
            href: "/admin",
            label: "Admin",
            active: pathname.startsWith("/admin"),
          },
        ]
      : []),
  ];

  return (
    <header className="z-20 border-b bg-background lg:sticky lg:top-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:h-16">
        <Link
          href="/events"
          aria-label="EventPass home"
          className="flex min-h-11 min-w-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <EventPassMark wordmarkClassName="max-sm:sr-only" />
        </Link>
        {/* Shown at every width: hiding it below `sm` left a phone with no route
            to Admin at all. */}
        <nav className="flex items-center gap-1" aria-label="Primary">
          {links.map((link) => (
            <PendingLink
              key={link.href}
              href={link.href}
              aria-current={link.active ? "page" : undefined}
              pendingLabel={`Opening ${link.label}`}
              className={cn(
                "flex h-10 items-center rounded-md px-3 text-sm font-semibold transition-colors",
                link.active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {link.label}
            </PendingLink>
          ))}
        </nav>
        <div className="ml-auto">
          <AccountMenu email={email} name={name} signOutAction={signOutAction} />
        </div>
      </div>
    </header>
  );
}
