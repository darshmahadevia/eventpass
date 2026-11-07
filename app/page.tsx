import {
  IconCalendarEvent,
  IconChecklist,
  IconForms,
  IconQrcode,
  IconUsers,
  IconWifiOff,
} from "@tabler/icons-react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, Card, Logo } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { startDemoAction } from "./actions";

const FEATURES = [
  { icon: IconCalendarEvent, title: "Events in a minute", body: "Title, time, place, capacity. Publish when you're ready and share one link." },
  { icon: IconForms, title: "Your own questions", body: "Add text, choice, and checkbox fields to the registration form." },
  { icon: IconQrcode, title: "QR tickets by email", body: "Guests get a ticket page with a QR code that works on screen or on paper." },
  { icon: IconWifiOff, title: "Offline door scanner", body: "The guest list lives on the phone. Scans queue offline and sync when the network returns." },
  { icon: IconChecklist, title: "Live arrivals", body: "See who's in, who's expected, and capacity at a glance. Undo a check-in in one tap." },
  { icon: IconUsers, title: "Door team", body: "Add volunteers by email. They sign in and only see the scanner for your event." },
];

export default async function HomePage() {
  const user = await getUser();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo className="text-lg" />
        <ButtonLink href={user ? "/events" : "/sign-in"} variant="secondary">
          {user ? "Your events" : "Sign in"}
        </ButtonLink>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
              Registration · Tickets · Check-in
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              The door keeps moving when the Wi-Fi doesn&apos;t.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted text-pretty">
              EventPass takes guests from a sign-up link to a QR ticket to the front door. Volunteers scan
              with their phone camera, online or off, and every arrival shows up on your dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <form action={startDemoAction}>
                <SubmitButton pendingText="Setting up demo…" className="h-12 px-6 text-base">
                  Try the live demo
                </SubmitButton>
              </form>
              <ButtonLink href="/sign-in" variant="secondary" className="h-12 px-6 text-base">
                Create an event
              </ButtonLink>
            </div>
            <p className="mt-3 text-sm text-muted">The demo opens a sample event with 46 guests. No email needed.</p>
          </div>

          <ScanPreview />
        </section>

        <section className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything between the invite and the door</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <Icon className="size-6 text-accent" stroke={1.75} />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl justify-between px-4 py-8 text-sm text-muted sm:px-6">
        <span>EventPass</span>
        <Link href="/sign-in" className="hover:text-fg">
          Organizer sign in
        </Link>
      </footer>
    </div>
  );
}

function ScanPreview() {
  return (
    <div className="mx-auto w-full max-w-sm" aria-hidden>
      <Card className="overflow-hidden shadow-xl shadow-accent/10">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
          <span className="font-semibold">Door · Main entrance</span>
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
            Offline · 3 queued
          </span>
        </div>
        <div className="grid gap-3 p-4">
          <div className="rounded-xl bg-success px-5 py-6 text-center text-white">
            <p className="text-sm font-semibold opacity-90">Admitted</p>
            <p className="mt-1 text-2xl font-bold">Maya Okafor</p>
            <p className="mt-1 font-mono text-xs opacity-80">7KQ2-M9XD-4TRH-PB3N</p>
          </div>
          <div className="rounded-xl bg-danger-soft px-5 py-4 text-center text-danger">
            <p className="text-sm font-semibold">Already checked in at 7:42 PM</p>
            <p className="font-bold">Leo Novak</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {[
              ["31", "In"],
              ["13", "Expected"],
              ["80", "Capacity"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-lg bg-subtle py-2">
                <p className="text-lg font-bold">{n}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
