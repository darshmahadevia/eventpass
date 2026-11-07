import Link from "next/link";
import { Stamp } from "@/components/ticket";
import { Logo } from "@/components/ui";

/** A spoiled ticket, for pages that went wrong. */
export function VoidTicket({
  code,
  stamp,
  title,
  body,
  children,
}: {
  code: string;
  stamp: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-8">
      <header>
        <Link href="/" className="inline-block rounded-md">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto grid w-full max-w-md flex-1 content-center py-12">
        <div className="paper-shadow relative grayscale-[0.35]">
          <div className="notch-b relative rounded-t-3xl bg-accent px-6 pt-6 pb-8 text-ink">
            <p className="text-sm font-semibold">Admit no one</p>
            <p className="display mt-4 text-7xl leading-none">{code}</p>
            <span aria-hidden className="perf-x absolute inset-x-5 -bottom-px" />
          </div>
          <div className="notch-t h-16 rounded-b-3xl bg-white" />
          <div className="absolute top-[34%] right-5 [--tilt:-8deg]">
            <Stamp tone="void">{stamp}</Stamp>
          </div>
        </div>
        <h1 className="display mt-12 text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-3 text-pretty text-muted">{body}</p>
        <div className="mt-8 flex flex-wrap gap-2">{children}</div>
      </main>
    </div>
  );
}
