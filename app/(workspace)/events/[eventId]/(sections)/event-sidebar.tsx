"use client";

import { useState, ViewTransition, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconClipboardCheck,
  IconDots,
  IconExternalLink,
  IconForms,
  IconHistory,
  IconLayoutDashboard,
  IconScan,
  IconSettings,
  IconUserShield,
  IconUsers,
} from "@tabler/icons-react";

import { CopyLinkButton } from "@/components/copy-link-button";
import { PendingLink } from "@/components/pending-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Wide screens get a rail with every section. A phone gets a bar at the bottom
// edge, because an organizer working a door is holding the phone in one hand:
// the four places they move between during doors are one thumb tap away and
// the setup sections sit behind More. A drawer behind a hamburger hid all seven
// and cost two taps to reach anything.

type EventSidebarProps = {
  eventId: string;
  eventName: string;
  eventSlug: string;
  statusLabel: string;
  statusVariant: "secondary" | "default" | "destructive" | "success";
  showScanner: boolean;
  showPublicPage: boolean;
};

type NavItem = {
  label: string;
  href: string;
  exact: boolean;
  icon: ComponentType<{ className?: string; "aria-hidden"?: "true" }>;
};

function navItems(eventId: string) {
  return {
    overview: {
      label: "Overview",
      href: `/events/${eventId}`,
      exact: true,
      icon: IconLayoutDashboard,
    },
    guests: {
      label: "Guests",
      href: `/events/${eventId}/registrations`,
      exact: false,
      icon: IconUsers,
    },
    checkIn: {
      label: "Check-in",
      href: `/events/${eventId}/check-in`,
      exact: false,
      icon: IconClipboardCheck,
    },
    form: {
      label: "Registration form",
      href: `/events/${eventId}/form`,
      exact: false,
      icon: IconForms,
    },
    staff: {
      label: "Staff",
      href: `/events/${eventId}/staff`,
      exact: false,
      icon: IconUserShield,
    },
    audit: {
      label: "Audit log",
      href: `/events/${eventId}/audit`,
      exact: false,
      icon: IconHistory,
    },
    settings: {
      label: "Settings",
      href: `/events/${eventId}/edit`,
      exact: false,
      icon: IconSettings,
    },
  } satisfies Record<string, NavItem>;
}

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function PublicLinks({
  eventSlug,
  showPublicPage,
}: {
  eventSlug: string;
  showPublicPage: boolean;
}) {
  if (!showPublicPage) return null;
  return (
    <>
      <CopyLinkButton path={`/e/${eventSlug}`} className="h-11 w-full" />
      <Link
        href={`/e/${eventSlug}`}
        target="_blank"
        className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full")}
      >
        Open public page
        <IconExternalLink data-icon="inline-end" />
      </Link>
    </>
  );
}

function SectionLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <PendingLink
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      pendingLabel="Loading"
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {item.label}
    </PendingLink>
  );
}

function Rail({
  eventId,
  eventName,
  eventSlug,
  statusLabel,
  statusVariant,
  showScanner,
  showPublicPage,
}: EventSidebarProps) {
  const pathname = usePathname();
  const items = navItems(eventId);

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex flex-col gap-3">
        <PendingLink
          href="/events"
          className="inline-flex min-h-6 w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          pendingLabel="Events"
        >
          <IconArrowLeft aria-hidden="true" className="size-4" />
          Events
        </PendingLink>
        <div className="flex flex-col gap-1.5">
          {/* Paired with the same name in the events list. */}
          <ViewTransition name={`event-${eventId}`}>
            <p className="text-lg leading-snug font-headline text-balance">
              {eventName}
            </p>
          </ViewTransition>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </div>

      <nav aria-label={`${eventName} sections`} className="flex flex-col gap-0.5">
        {Object.values(items).map((item) => (
          <SectionLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {showScanner || showPublicPage ? (
        <div className="mt-auto flex flex-col gap-2 border-t pt-4">
          {showScanner ? (
            <PendingLink
              href={`/scanner/${eventId}`}
              className={cn(buttonVariants(), "h-11")}
              pendingLabel="Opening scanner"
            >
              <IconScan data-icon="inline-start" />
              Open scanner
            </PendingLink>
          ) : null}
          <PublicLinks eventSlug={eventSlug} showPublicPage={showPublicPage} />
        </div>
      ) : null}
    </div>
  );
}

const TAB =
  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40";

function BottomBar({
  eventId,
  eventName,
  eventSlug,
  showScanner,
  showPublicPage,
}: EventSidebarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = navItems(eventId);
  const moreItems: NavItem[] = [items.form, items.staff, items.audit, items.settings];
  const moreActive = moreItems.some((item) => isActive(item, pathname));

  const tab = (item: NavItem, label = item.label) => {
    const active = isActive(item, pathname);
    const Icon = item.icon;
    return (
      <PendingLink
        href={item.href}
        aria-current={active ? "page" : undefined}
        pendingLabel="Loading"
        className={cn(
          TAB,
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-6" />
        <span className="truncate">{label}</span>
      </PendingLink>
    );
  };

  return (
    <nav
      aria-label={`${eventName} sections`}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
    >
      <div className="mx-auto flex h-16 max-w-xl items-stretch gap-1 px-2">
        {tab(items.overview)}
        {tab(items.guests)}
        {showScanner ? (
          <PendingLink
            href={`/scanner/${eventId}`}
            pendingLabel="Opening scanner"
            className={cn(TAB, "text-foreground")}
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <IconScan aria-hidden="true" className="size-5" />
            </span>
            <span className="truncate">Scan</span>
          </PendingLink>
        ) : null}
        {tab(items.checkIn)}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              TAB,
              moreActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <IconDots aria-hidden="true" className="size-6" />
            <span>More</span>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85svh] overflow-y-auto rounded-t-[var(--radius-overlay)] bg-sidebar p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sidebar-foreground"
          >
            <SheetTitle className="min-h-8 pr-12 text-base font-headline">
              More for this event
            </SheetTitle>
            <div className="mt-2 flex flex-col gap-0.5">
              {moreItems.map((item) => (
                <SectionLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMoreOpen(false)}
                />
              ))}
            </div>
            {showPublicPage ? (
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                <PublicLinks
                  eventSlug={eventSlug}
                  showPublicPage={showPublicPage}
                />
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export function EventSidebar(props: EventSidebarProps) {
  return (
    <>
      <div
        role="region"
        aria-label="Current event"
        className="sticky top-0 z-20 flex min-h-12 items-center gap-1 border-b bg-sidebar py-1 pr-4 pl-1 lg:hidden"
      >
        <PendingLink
          href="/events"
          aria-label="Back to all events"
          pendingLabel="Events"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <IconChevronLeft />
        </PendingLink>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {props.eventName}
        </p>
        <Badge variant={props.statusVariant}>{props.statusLabel}</Badge>
      </div>

      <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:block">
        <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-y-auto">
          <Rail {...props} />
        </div>
      </aside>

      <BottomBar {...props} />
    </>
  );
}
