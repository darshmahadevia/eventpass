import { IconLogout } from "@tabler/icons-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme";
import { Button, Logo } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isDemoEmail } from "@/lib/utils";
import { signOutAction } from "../sign-in/actions";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isDemo = isDemoEmail(user.email);

  return (
    <div className="flex min-h-dvh flex-col">
      {isDemo && (
        <p className="bg-accent px-4 py-2 text-center text-sm font-semibold text-balance text-ink">
          You&apos;re in a demo account. Look around and change anything; it&apos;s all cleared after a day.
        </p>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link href="/events" className="rounded-md" aria-label="EventPass, your events">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-56 truncate text-sm text-muted md:inline">
              {isDemo ? "Demo organizer" : user.email}
            </span>
            <ThemeSwitcher />
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" className="px-2.5 text-muted hover:text-fg" aria-label="Sign out" title="Sign out">
                <IconLogout aria-hidden className="size-[1.125rem]" stroke={1.9} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 sm:px-8 sm:pt-10">{children}</main>
    </div>
  );
}
