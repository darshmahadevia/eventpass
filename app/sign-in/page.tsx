import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Logo } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/utils";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  if (await getUser()) redirect(safeRedirectPath(next));

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo className="text-xl" />
        </Link>
        <Card className="p-6">
          <h1 className="text-xl font-bold">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Organizers and door staff sign in with an emailed code.</p>
          <SignInForm next={typeof next === "string" ? next : undefined} />
        </Card>
      </div>
    </main>
  );
}
