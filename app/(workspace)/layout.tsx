import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isDemoEmail } from "@/lib/utils";
import { signOutAction } from "../sign-in/actions";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isDemo = isDemoEmail(user.email);

  return (
    <div className="min-h-dvh">
      {isDemo && (
        <div className="bg-accent px-4 py-2 text-center text-sm font-medium text-accent-fg">
          You&apos;re in a demo account. Data is temporary and is cleared after a day.
        </div>
      )}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/events">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden truncate text-muted sm:inline">{isDemo ? "Demo organizer" : user.email}</span>
            <form action={signOutAction}>
              <Button variant="ghost" className="h-8 px-3">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
