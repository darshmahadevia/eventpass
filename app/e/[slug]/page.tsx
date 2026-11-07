import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ThemeSwitcher } from "@/components/theme";
import { Logo, Notice } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { closedReason, countRegistered } from "@/lib/events";
import { posterSize, stockFor } from "@/lib/stock";
import { dateParts, formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";
import { registerAction } from "./actions";
import { RegistrationForm } from "./registration-form";

const getEvent = cache((slug: string) => db.query.events.findFirst({ where: eq(schema.events.slug, slug) }));

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  if (!event) return {};
  return { title: event.title, description: event.description.slice(0, 160) || undefined };
}

const CLOSED_COPY = {
  draft: "This is a preview only you can see. Registration opens when you publish the event.",
  cancelled: "This event has been cancelled.",
  ended: "This event has ended.",
  full: "This event is full, so registration is closed.",
} as const;

export default async function PublicEventPage({ params }: PageProps<"/e/[slug]">) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();
  if (event.status === "draft" && (await getUser())?.id !== event.ownerId) notFound();

  const registered = await countRegistered(event.id);
  const reason = closedReason(event, registered);
  const spotsLeft = event.capacity === null ? null : Math.max(0, event.capacity - registered);
  const date = dateParts(event.startsAt, event.timeZone);

  return (
    <div data-stock={stockFor(event.id)} className="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* The poster: the left half of the page is the ticket itself. */}
      <section className="notch-b relative flex flex-col bg-accent px-5 pt-5 pb-8 text-ink [--n:15px] sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:p-10 lg:[mask:none]">
        <Link href="/" className="w-fit rounded-md [--accent:#000] [--bg:var(--stock)] [--fg:#000]">
          <Logo />
        </Link>

        <div className="mt-14 lg:mt-auto">
          <p className="display text-2xl sm:text-3xl">
            {date.weekday}, {date.month} {date.day}
          </p>
          <h1 className={cn("display mt-3 text-balance break-words", posterSize(event.title))}>{event.title}</h1>
          <dl className="mt-7 grid gap-x-10 gap-y-3 text-[0.9375rem] leading-snug sm:grid-flow-col sm:auto-cols-max">
            <div>
              <dt className="text-sm opacity-70">Time</dt>
              <dd className="font-semibold">{formatTimeRange(event.startsAt, event.endsAt, event.timeZone)}</dd>
            </div>
            {event.location && (
              <div className="min-w-0 sm:max-w-72">
                <dt className="text-sm opacity-70">Place</dt>
                <dd className="font-semibold">{event.location}</dd>
              </div>
            )}
            {spotsLeft !== null && reason === null && (
              <div>
                <dt className="text-sm opacity-70">Availability</dt>
                <dd className="font-semibold">
                  {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                </dd>
              </div>
            )}
          </dl>
        </div>
        <span aria-hidden className="perf-y absolute inset-y-6 -right-px hidden lg:block" />
        <span aria-hidden className="perf-x absolute inset-x-6 -bottom-px lg:hidden" />
      </section>

      <main className="relative px-5 py-8 sm:px-8 lg:px-14 lg:py-10">
        <div className="mx-auto max-w-[30rem]">
          <div className="flex justify-end">
            <ThemeSwitcher />
          </div>

          {event.description && (
            <p className="mt-6 text-lg leading-relaxed whitespace-pre-line text-pretty lg:mt-10">{event.description}</p>
          )}

          <section className={cn("mt-10", !event.description && "lg:mt-16")}>
            <h2 className="display mb-6 text-4xl">{reason === null ? "Register" : reason === "draft" ? "Preview" : "Registration closed"}</h2>
            {reason === "draft" && (
              <Notice tone="accent" className="mb-6">
                {CLOSED_COPY.draft}
              </Notice>
            )}
            {reason === null || reason === "draft" ? (
              <div className={reason === "draft" ? "pointer-events-none opacity-60" : undefined} inert={reason === "draft"}>
                <RegistrationForm register={registerAction.bind(null, event.slug)} fields={event.form} />
              </div>
            ) : (
              <Notice tone={reason === "cancelled" ? "danger" : "neutral"}>{CLOSED_COPY[reason]}</Notice>
            )}
          </section>

          <p className="mt-12 text-sm text-faint">
            Tickets by{" "}
            <Link href="/" className="font-medium underline underline-offset-4 hover:text-fg">
              EventPass
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
