import Link from "next/link";
import { redirect } from "next/navigation";
import { startDemoAction } from "@/app/actions";
import { ThemeSwitcher } from "@/components/theme";
import { Logo } from "@/components/ui";
import { getUser } from "@/lib/auth";
import type { Stock } from "@/lib/stock";
import { cn, safeRedirectPath } from "@/lib/utils";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  if (await getUser()) redirect(safeRedirectPath(next));

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="flex flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="rounded-md">
            <Logo />
          </Link>
          <ThemeSwitcher />
        </header>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="display text-5xl">Sign in</h1>
          <p className="mt-3 mb-8 text-muted">For organizers and door staff. No password, just a code by email.</p>
          <SignInForm next={typeof next === "string" ? next : undefined} />
          <form action={startDemoAction} className="mt-8 border-t border-line pt-5 text-sm text-muted">
            Just looking?{" "}
            <button className="font-semibold text-fg underline underline-offset-4 hover:text-accent-text">
              Try the live demo
            </button>
          </form>
        </div>
      </main>
      <TicketFan />
    </div>
  );
}

const FAN: { stock: Stock; label: string; tilt: string }[] = [
  { stock: "lilac", label: "Rooftop Sessions", tilt: "-rotate-[14deg] -translate-x-16 -translate-y-20" },
  { stock: "sky", label: "Spring Product Meetup", tilt: "rotate-[9deg] translate-x-14 -translate-y-6" },
  { stock: "marigold", label: "Friday Night Doors", tilt: "-rotate-[4deg] translate-y-14" },
];

function TicketFan() {
  return (
    <aside aria-hidden className="relative hidden place-items-center overflow-hidden border-l border-line bg-surface lg:grid">
      {FAN.map(({ stock, label, tilt }) => (
        <div
          key={stock}
          data-stock={stock}
          className={cn("paper-shadow absolute flex h-56 w-[26rem] text-ink", tilt)}
        >
          <div className="notch-r relative flex flex-1 flex-col justify-between rounded-l-3xl bg-accent p-6 [--n:13px] [--perf:var(--surface)]">
            <p className="text-sm font-semibold">Admit one</p>
            <p className="display text-4xl">{label}</p>
            <span className="perf-y absolute inset-y-4 -right-px" />
          </div>
          <div className="notch-l w-24 rounded-r-3xl bg-accent [--n:13px]" />
        </div>
      ))}
    </aside>
  );
}
