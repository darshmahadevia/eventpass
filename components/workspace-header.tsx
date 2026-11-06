"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { EventPassMark } from "@/components/eventpass-mark";
import { PendingLink } from "@/components/pending-link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SignOutButton } from "@/features/staff-identity/sign-out-button";
import { cn } from "@/lib/utils";

/**
 * The signed-in chrome, shared by the event workspace and the administration
 * surface. Active state follows the pathname.
 */
export function WorkspaceHeader({
  email,
  signOutAction,
  showAdmin,
}: {
  email: string;
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
    <header className="sticky top-0 z-20 border-b bg-background">
      <div className="flex h-16 w-full items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/events"
          aria-label="EventPass home"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
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
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />
          <span className="hidden max-w-52 truncate text-sm text-muted-foreground md:block">
            {email}
          </span>
          <form action={signOutAction}>
            <SignOutButton />
          </form>
        </div>
      </div>
    </header>
  );
}
