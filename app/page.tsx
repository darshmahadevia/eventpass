import Link from "next/link";
import QRCode from "qrcode";
import { SubmitButton } from "@/components/submit-button";
import { ThemeSwitcher } from "@/components/theme";
import { ButtonLink, Logo } from "@/components/ui";
import { getUser } from "@/lib/auth";
import type { Stock } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { startDemoAction } from "./actions";
import { DoorDemo } from "./door-demo";

const JOURNEY: { stock: Stock; title: string; body: string }[] = [
  {
    stock: "marigold",
    title: "Share one link",
    body: "Set the time, the place, and a capacity. Add your own questions, publish, and send the link anywhere.",
  },
  {
    stock: "rose",
    title: "Guests get a ticket",
    body: "No account to make. Each guest gets a QR ticket by email that works on a phone or on paper.",
  },
  {
    stock: "mint",
    title: "Scan at the door",
    body: "Volunteers use their phone camera. Green means in, red means stop, and you see every arrival live.",
  },
];

// Made-up nights on the roll that runs under the hero.
const ROLL: { stock: Stock; title: string; date: string }[] = [
  { stock: "marigold", title: "Friday Night Doors", date: "Fri, Nov 13" },
  { stock: "sky", title: "Spring Product Meetup", date: "Tue, Mar 9" },
  { stock: "rose", title: "Rooftop Sessions", date: "Sat, Jun 20" },
  { stock: "mint", title: "Run Club Social", date: "Sun, Apr 12" },
  { stock: "lilac", title: "Zine Fair", date: "Sat, Oct 3" },
  { stock: "marigold", title: "Supper Club No. 12", date: "Thu, Feb 19" },
  { stock: "sky", title: "Hack Night", date: "Wed, Jan 28" },
  { stock: "rose", title: "Open Mic at the Lido", date: "Fri, May 8" },
];

const HEADLINE = ["The", "door", "keeps", "moving", "when", "the", "Wi\u2011Fi", "doesn\u2019t."];

const OFFLINE = [
  {
    title: "Before doors",
    body: "The scanner saves the whole guest list to the phone and keeps it fresh every 15 seconds.",
  },
  {
    title: "When the network drops",
    body: "Scans are checked against the list on the phone. Repeat tickets still get caught, and each admission is saved with its time.",
  },
  {
    title: "When it comes back",
    body: "Saved scans sync on their own. If two doors let in the same ticket, the scanner tells you who.",
  },
];

const DETAILS = [
  ["Your own questions", "Short answers, multiple choice, and checkboxes on the registration form."],
  ["Capacity that holds", "Sign-ups stop at your limit, even when two people register at the same moment."],
  ["A door team", "Add volunteers by email. They sign in and only see the scanner for your event."],
  ["Live arrivals", "Who's in, who's expected, and how full the room is, with one-tap undo."],
  ["Guest list export", "Download everyone, with their answers, as a CSV."],
  ["Calendar and print", "Guests can add the event to a calendar or print their ticket."],
];

export default async function HomePage() {
  const user = await getUser();
  const qr = await QRCode.toString("EVENTPASS-DEMO-TICKET", { type: "svg", margin: 0, errorCorrectionLevel: "L" });

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-12">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <ButtonLink href={user ? "/events" : "/sign-in"} variant="secondary" size="sm">
            {user ? "Your events" : "Sign in"}
          </ButtonLink>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[90rem] items-center gap-x-12 gap-y-14 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:px-12 lg:pt-6 lg:pb-28 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <h1 className="display text-[clamp(3rem,6.6vw,6.5rem)] leading-[0.98] text-balance">
              {HEADLINE.map((word, i) => (
                <span key={i}>
                  <span className="word-mask">
                    <span style={{ "--i": i } as React.CSSProperties} className={cn(i === HEADLINE.length - 1 && "relative isolate")}>
                      {word}
                      {i === HEADLINE.length - 1 && (
                        <span aria-hidden className="draw-x absolute inset-x-0 bottom-[0.02em] -z-10 h-[0.16em] rounded-full bg-accent [--d:700]" />
                      )}
                    </span>
                  </span>
                  {i < HEADLINE.length - 1 && " "}
                </span>
              ))}
            </h1>
            <p className="rise mt-7 max-w-xl text-xl leading-relaxed text-pretty text-muted [--d:450]">
              Registration, QR tickets, and a phone scanner for the front door, built for the moment the venue
              network gives out.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3 [--d:550]">
              <form action={startDemoAction}>
                <SubmitButton size="lg" pendingText="Setting up demo…">
                  Try the live demo
                </SubmitButton>
              </form>
              <ButtonLink href={user ? "/events/new" : "/sign-in?next=/events/new"} variant="secondary" size="lg">
                Create an event
              </ButtonLink>
            </div>
            <p className="rise mt-4 text-muted [--d:650]">Opens a sample event with 46 guests. No email needed.</p>
          </div>

          <DoorDemo qr={qr} />
        </section>

        <TicketRoll />

        {/* A strip of tickets off one roll: the real order of things, so it's numbered. */}
        <section className="mx-auto mt-24 max-w-[90rem] px-5 sm:mt-32 sm:px-8 lg:px-12">
          <h2 className="scroll-rise display text-4xl sm:text-5xl lg:text-6xl">From invite to door</h2>
          <ol className="paper-shadow mt-10 grid lg:grid-cols-3">
            {JOURNEY.map(({ stock, title, body }, index) => (
              <li
                key={title}
                data-stock={stock}
                style={{ "--i": index, "--r": ["-4deg", "3deg", "-2deg"][index] } as React.CSSProperties}
                className={cn(
                  "scroll-deal relative flex min-h-80 flex-col justify-between bg-accent p-7 text-ink lg:p-8",
                  index === 0 && "notch-b rounded-t-3xl lg:notch-r lg:rounded-l-3xl lg:rounded-tr-none",
                  index === 1 && "notch-both",
                  index === 2 && "notch-t rounded-b-3xl lg:notch-l lg:rounded-r-3xl lg:rounded-bl-none",
                )}
              >
                <p className="display text-7xl leading-none">{index + 1}</p>
                <div>
                  <h3 className="display text-3xl">{title}</h3>
                  <p className="mt-3 max-w-sm text-lg leading-snug text-pretty">{body}</p>
                </div>
                {index < 2 && (
                  <>
                    <span aria-hidden className="perf-x absolute inset-x-5 -bottom-px lg:hidden" />
                    <span aria-hidden className="perf-y absolute inset-y-5 -right-px hidden lg:block" />
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mt-28 grid max-w-[90rem] gap-x-16 gap-y-10 px-5 sm:px-8 lg:mt-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:px-12">
          <div>
            <h2 className="scroll-rise display text-4xl text-balance sm:text-5xl lg:text-6xl lg:sticky lg:top-24">
              What actually happens when the network drops
            </h2>
          </div>
          <ol className="grid">
            {OFFLINE.map(({ title, body }, index) => (
              <li key={title} className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 pb-10 last:pb-0">
                <span
                  className={cn(
                    "scroll-pop z-10 grid size-10 place-items-center rounded-full font-bold text-ink",
                    index === 1 ? "bg-warning [[data-theme=light]_&]:text-white" : "bg-go",
                  )}
                >
                  {index + 1}
                </span>
                {index < 2 && <span aria-hidden className="scroll-draw absolute top-10 bottom-0 left-5 w-px -translate-x-1/2 bg-line-strong" />}
                <div className="scroll-rise pt-1.5">
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-1.5 max-w-xl text-lg leading-relaxed text-pretty text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mt-28 max-w-[90rem] px-5 sm:px-8 lg:mt-36 lg:px-12">
          <h2 className="scroll-rise display text-4xl sm:text-5xl lg:text-6xl">Also in the box</h2>
          <dl className="mt-8 grid border-t border-line md:grid-cols-2 md:gap-x-16">
            {DETAILS.map(([title, body], index) => (
              <div
                key={title}
                style={{ "--i": index % 2 } as React.CSSProperties}
                className="scroll-rise grid gap-1 border-b border-line py-5"
              >
                <dt className="text-lg font-bold">{title}</dt>
                <dd className="text-pretty text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto mt-28 max-w-[90rem] px-5 sm:px-8 lg:mt-36 lg:px-12">
          <div className="scroll-grow paper-shadow">
            <div className="flex flex-wrap items-end justify-between gap-8 rounded-3xl bg-accent p-8 text-ink lg:p-12">
              <h2 className="display max-w-3xl text-[clamp(2.5rem,5vw,4.75rem)] leading-[0.98] text-balance">
                See it with 46 guests at the door.
              </h2>
              <form action={startDemoAction}>
                <SubmitButton size="lg" pendingText="Setting up demo…" className="bg-ink text-white hover:brightness-100 hover:bg-[#222]">
                  Try the live demo
                </SubmitButton>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-16 flex max-w-[90rem] items-center justify-between gap-4 px-5 pb-10 text-muted sm:px-8 lg:px-12">
        <Logo className="text-lg" />
        <Link href="/sign-in" className="text-sm font-medium underline-offset-4 hover:text-fg hover:underline">
          Organizer sign in
        </Link>
      </footer>
    </div>
  );
}

/** A band of real-looking tickets running under the hero, slightly askew, like a roll laid on the table. */
function TicketRoll() {
  const strip = (copy: number) =>
    ROLL.map(({ stock, title, date }, i) => (
      <li key={`${copy}-${i}`} data-stock={stock} className="notch-x flex h-20 shrink-0 rounded-xl bg-accent text-ink">
        <div className="relative grid content-center px-5">
          <p className="text-[0.6875rem] font-bold tracking-[0.12em] uppercase">Admit one</p>
          <p className="font-mono text-xs opacity-60">No. {String(1041 + i * 37).padStart(5, "0")}</p>
          <span className="perf-y absolute inset-y-2 -right-px [--perf:var(--surface)]" />
        </div>
        <div className="grid content-center pr-6 pl-5">
          <p className="display text-2xl leading-tight whitespace-nowrap">{title}</p>
          <p className="text-sm font-semibold opacity-70">{date}</p>
        </div>
      </li>
    ));

  return (
    <div aria-hidden className="marquee-band rise relative -mx-4 -rotate-2 overflow-hidden border-y border-line bg-surface py-5 [--d:800]">
      <ul className="marquee flex w-max gap-4 pr-4">
        {strip(0)}
        {strip(1)}
      </ul>
    </div>
  );
}
