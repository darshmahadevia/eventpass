import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";

import { EventPassMark } from "@/components/eventpass-mark";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";
import { ScanOutcome } from "@/features/admission/scan-outcome";
import { DoorAnswers } from "@/features/landing/door-answers";
import { DoorStage } from "@/features/landing/door-stage";
import { LandingHeader } from "@/features/landing/landing-header";
import { OperationsPreview } from "@/features/landing/operations-preview";
import { PhoneFrame } from "@/features/landing/phone-frame";
import { TicketShowcase } from "@/features/landing/product-showcase";
import { cn } from "@/lib/utils";

import "@/features/landing/landing.css";

export const metadata: Metadata = {
  title: {
    absolute: "EventPass — event check-in that works without Wi-Fi",
  },
  description:
    "Registration, tickets, and door check-in for in-person events. The scanner keeps working when the venue network does not.",
};

const assurances = [
  {
    title: "Offline scans stay accountable",
    description:
      "The same phone catches repeat scans immediately. When separate phones scan offline, EventPass reconciles them after reconnecting and keeps every conflict visible.",
  },
  {
    title: "Mistakes are fixable",
    description:
      "Undo a check-in, reissue a ticket, or change who has access. Every correction keeps the name, time, and reason.",
  },
  {
    title: "One screen for the room",
    description:
      "Arrivals, capacity, and anything still waiting to confirm sit together, so you never guess how full the room is.",
  },
];

// A run of show: the times are the structure, so they carry the row.
const runOfShow = [
  {
    when: "Weeks out",
    who: "Organizer",
    title: "Set up the event",
    description:
      "Set capacity and check-in times, build the registration form, and invite the people working the door.",
  },
  {
    when: "As guests sign up",
    who: "Guest",
    title: "Register and get a ticket",
    description:
      "Guests confirm by email and their ticket arrives straight away. No account to create, nothing to install.",
  },
  {
    when: "Before doors",
    who: "Volunteer",
    title: "Load the guest list",
    description:
      "Volunteers download the list onto their phone while the signal is good, so the door is ready before the network is tested.",
  },
  {
    when: "Doors open",
    who: "Volunteer",
    title: "Scan and admit",
    description:
      "One scan, one clear answer. Anything unusual says so in plain words, along with what to do next.",
  },
  {
    when: "After the last guest",
    who: "Organizer",
    title: "Settle the count",
    description:
      "Held scans reconcile, conflicts wait for a person, and every correction stays in the audit log.",
  },
];

const questions = [
  {
    question: "Do guests need an app or an account?",
    answer:
      "No. Guests register through a link, confirm by email, and receive their ticket. It opens on any phone and prints cleanly on paper.",
  },
  {
    question: "What happens to scans when the Wi-Fi drops?",
    answer:
      "Volunteers keep admitting guests. Each scan is saved on the phone and shown as not confirmed yet, then goes to the server once the phone reconnects.",
  },
  {
    question: "What if two phones scan the same ticket offline?",
    answer:
      "The phones reconcile after reconnecting. If they disagree, the conflict stays visible until a member of staff resolves it. A repeat on the same phone is caught on the spot.",
  },
  {
    question: "What do door volunteers need?",
    answer:
      "A phone with a camera and an invitation from the organizer. They load the guest list before doors open, while the signal is good.",
  },
  {
    question: "Can I bring a guest list I already have?",
    answer:
      "Yes. Import registrations from a CSV file, preview them first, and export the list again whenever you need it.",
  },
];

const ctaSize = "h-12 px-5 text-base has-data-[icon=inline-end]:pr-4";

function PrimaryCta() {
  return (
    <PendingLink
      href="/sign-in"
      className={cn(buttonVariants({ size: "lg" }), ctaSize)}
      pendingLabel="Opening sign in"
    >
      Get started
      <IconArrowRight data-icon="inline-end" />
    </PendingLink>
  );
}

function DemoCta() {
  return (
    <PendingLink
      href="/demo"
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        ctaSize,
        "border-poster-ink/50 bg-transparent hover:bg-poster-ink/10",
      )}
      pendingLabel="Opening demo"
    >
      Try the demo
    </PendingLink>
  );
}

function YesPanel({
  className,
  outcome,
  signal,
  note,
}: {
  className: string;
  outcome: "accepted" | "provisional";
  signal: string;
  note: string;
}) {
  return (
    <figure
      className={cn(
        "signal-surface flex flex-col items-center justify-center gap-8 px-4 py-12 text-poster-ink sm:py-16 xl:flex-row-reverse xl:gap-12",
        className,
      )}
    >
      <PhoneFrame>
        <ScanOutcome
          outcome={outcome}
          attendeeName="Priya Raman"
          titleAs="p"
          reserveQualifier
        />
      </PhoneFrame>
      <figcaption className="max-w-xs text-center xl:max-w-56 xl:text-left">
        <p className="type-answer">{signal}</p>
        <p className="mt-2 text-base text-pretty">{note}</p>
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only z-40 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <LandingHeader />

      <main id="main" className="flex-1">
        <DoorStage
          headline={
            <h1 id="stage-heading" className="type-stage">
              Keep the line moving when the{" "}
              <span className="whitespace-nowrap">Wi-Fi</span> doesn’t.
            </h1>
          }
          lede={
            <div className="flex flex-col items-start gap-4">
              <p className="max-w-lg text-base text-pretty sm:text-lg lg:text-xl lg:leading-snug">
                Registration, tickets, and door check-in for in-person events,
                on a scanner that keeps working when the venue network gives
                out.
              </p>
              <div className="flex flex-wrap gap-3">
                <PrimaryCta />
                <DemoCta />
              </div>
            </div>
          }
        />

        <section aria-labelledby="door-heading" id="door">
          <div className="mx-auto grid w-full max-w-[120rem] gap-6 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:items-end lg:gap-10">
            <h2 id="door-heading" className="type-section">
              Two kinds of yes, never confused.
            </h2>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty lg:text-xl lg:leading-snug">
              With a signal, a check-in is settled the moment it happens.
              Without one, it is held on the volunteer’s phone and shown as
              unconfirmed until it lands. EventPass will not colour those the
              same.
            </p>
          </div>

          <div className="grid md:grid-cols-2">
            <YesPanel
              className="bg-poster-confirmed"
              outcome="accepted"
              signal="With a signal"
              note="Settled at once, across every door."
            />
            <YesPanel
              className="bg-poster-held"
              outcome="provisional"
              signal="Without a signal"
              note="Let them in now. It reconciles after reconnecting."
            />
          </div>
        </section>

        <section aria-labelledby="answers-heading">
          <DoorAnswers
            intro={
              <div className="flex flex-col gap-5">
                <h2 id="answers-heading" className="type-section">
                  Trouble gets a plain answer.
                </h2>
                <p className="max-w-xl text-lg text-muted-foreground text-pretty">
                  A volunteer with a queue behind them gets what happened and
                  what to do next, in one glance. Pick a situation to see the
                  screen.
                </p>
              </div>
            }
          />
        </section>

        <section
          aria-labelledby="count-heading"
          id="count"
          className="dark border-y bg-background text-foreground"
        >
          <div className="mx-auto flex w-full max-w-[120rem] flex-col gap-12 px-4 py-20 sm:px-8 sm:py-28">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-10">
              <h2 id="count-heading" className="type-section">
                The count is honest.
              </h2>
              <p className="max-w-xl text-lg text-muted-foreground text-pretty lg:text-xl lg:leading-snug">
                What the volunteer sees and what the organizer sees agree, and
                anything still unconfirmed is counted as exactly that.
              </p>
            </div>

            <OperationsPreview />

            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-3">
              {assurances.map(({ description, title }) => (
                <li className="flex flex-col gap-2" key={title}>
                  <h3 className="text-lg font-medium">{title}</h3>
                  <p className="text-base text-muted-foreground text-pretty">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="ticket-heading"
          className="bg-muted [--ticket-surround:var(--muted)]"
          id="ticket"
        >
          <div className="mx-auto grid w-full max-w-[120rem] gap-10 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
            <div className="flex flex-col gap-5">
              <h2 id="ticket-heading" className="type-section">
                A ticket built for a phone at a door.
              </h2>
              <p className="max-w-xl text-lg text-muted-foreground text-pretty">
                The code, the guest, and the event lead on every screen size. It
                scans from a cracked phone in a dark corridor and prints cleanly
                if someone would rather bring paper.
              </p>
            </div>
            <TicketShowcase />
          </div>
        </section>

        <section aria-labelledby="how-heading" id="how-it-works">
          <div className="mx-auto w-full max-w-[120rem] px-4 py-20 sm:px-8 sm:py-28">
            <h2 id="how-heading" className="type-section max-w-4xl">
              From the first sign-up to the final headcount.
            </h2>

            <ol className="mt-14 border-b">
              {runOfShow.map(({ description, title, when, who }) => (
                <li
                  key={title}
                  className="grid gap-x-10 gap-y-2 border-t py-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_6rem] md:items-baseline"
                >
                  <p className="type-answer">{when}</p>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-medium">{title}</h3>
                    <p className="max-w-xl text-base text-muted-foreground text-pretty">
                      {description}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground md:text-right">
                    {who}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="questions-heading" id="questions">
          <div className="mx-auto grid w-full max-w-[120rem] gap-10 px-4 pb-20 sm:px-8 sm:pb-28 lg:grid-cols-2">
            <h2 id="questions-heading" className="type-section">
              Questions from the door.
            </h2>
            <div className="faq-list border-b">
              {questions.map(({ answer, question }) => (
                <details key={question} name="faq" className="faq-item border-t">
                  <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-6 rounded-md py-4 text-lg font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                    {question}
                    <IconPlus aria-hidden="true" className="faq-plus size-5 shrink-0" />
                  </summary>
                  <p className="max-w-xl pb-6 text-base text-muted-foreground text-pretty">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="closing-heading"
          className="poster-surface signal-surface bg-poster-confirmed px-4 py-16 sm:px-8 sm:py-24"
        >
          <div className="closing-ticket relative mx-auto grid max-w-[120rem] md:grid-cols-[70%_30%]">
            <div className="p-6 sm:p-10 lg:p-14">
              <h2 id="closing-heading" className="type-section">
                Set up your next event tonight.
              </h2>
              <p className="mt-4 max-w-lg text-lg text-pretty">
                Create the event, share the registration link, and hand your
                door team a scanner that keeps going at the worst moment.
              </p>
            </div>
            <span aria-hidden="true" className="closing-seam" />
            <div className="flex flex-col items-stretch justify-center gap-3 p-6 sm:p-10 md:pl-12">
              <PrimaryCta />
              <DemoCta />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex w-full max-w-[120rem] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <EventPassMark />
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm">
            <Link
              href="/demo"
              className="py-3 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Try the demo
            </Link>
            <Link
              href="/sign-in"
              className="py-3 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
