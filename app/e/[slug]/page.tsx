import { IconCalendarEvent, IconMapPin, IconUsers } from "@tabler/icons-react";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Card, Logo, Notice } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { closedReason, countRegistered } from "@/lib/events";
import { formatEventRange } from "@/lib/time";
import { registerAction } from "./actions";
import { RegistrationForm } from "./registration-form";

const getEvent = cache((slug: string) => db.query.events.findFirst({ where: eq(schema.events.slug, slug) }));

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  if (!event) return {};
  return { title: event.title, description: event.description.slice(0, 160) || undefined };
}

const CLOSED_COPY = {
  draft: "This is a draft preview. Registration opens when you publish the event.",
  cancelled: "This event has been cancelled.",
  ended: "This event has ended.",
  full: "This event is full. Registration is closed.",
} as const;

export default async function PublicEventPage({ params }: PageProps<"/e/[slug]">) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();
  if (event.status === "draft" && (await getUser())?.id !== event.ownerId) notFound();

  const registered = await countRegistered(event.id);
  const reason = closedReason(event, registered);
  const spotsLeft = event.capacity === null ? null : Math.max(0, event.capacity - registered);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_24rem]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{event.title}</h1>
          <ul className="mt-6 grid gap-3 text-sm">
            <li className="flex gap-3">
              <IconCalendarEvent className="size-5 shrink-0 text-accent" />
              {formatEventRange(event.startsAt, event.endsAt, event.timeZone)}
            </li>
            {event.location && (
              <li className="flex gap-3">
                <IconMapPin className="size-5 shrink-0 text-accent" />
                {event.location}
              </li>
            )}
            {spotsLeft !== null && reason === null && (
              <li className="flex gap-3">
                <IconUsers className="size-5 shrink-0 text-accent" />
                {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
              </li>
            )}
          </ul>
          {event.description && (
            <p className="mt-8 leading-relaxed whitespace-pre-line text-pretty">{event.description}</p>
          )}
        </div>

        <Card className="h-fit p-6 lg:sticky lg:top-6">
          <h2 className="mb-5 text-lg font-bold">Register</h2>
          {reason === null ? (
            <RegistrationForm register={registerAction.bind(null, event.slug)} fields={event.form} />
          ) : (
            <Notice tone={reason === "draft" ? "accent" : "neutral"}>{CLOSED_COPY[reason]}</Notice>
          )}
        </Card>
      </main>
    </div>
  );
}
