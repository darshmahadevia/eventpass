import type { Metadata } from "next";
import { IconAlertCircle } from "@tabler/icons-react";

import { PublicAuthShell } from "@/components/public-auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SignInForm } from "@/features/staff-identity/sign-in-form";
import { inspectStaffInvitation } from "@/features/staffing/server/staffing-application";

export const metadata: Metadata = { title: "Sign in" };

type SignInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    callbackUrl?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, callbackUrl } = await searchParams;
  const requestedCallback = Array.isArray(callbackUrl)
    ? callbackUrl[0]
    : callbackUrl;
  const safeCallback =
    requestedCallback?.startsWith("/") && !requestedCallback.startsWith("//")
      ? requestedCallback
      : "/events";
  const hasInvalidLink = Array.isArray(error)
    ? error.includes("invalid-link") || error.includes("INVALID_TOKEN")
    : error === "invalid-link" || error === "INVALID_TOKEN";
  const isRateLimited = Array.isArray(error)
    ? error.includes("rate-limited")
    : error === "rate-limited";

  // Arriving from a staff invitation, the address is already known.
  const invitationToken = /^\/staff-invitations\/([^/?#]+)$/.exec(safeCallback)?.[1];
  const invitedEmail = invitationToken
    ? ((await inspectStaffInvitation(invitationToken))?.normalizedEmail ?? "")
    : "";

  return (
    <PublicAuthShell>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-headline text-balance">
            Sign in to EventPass
          </h1>
          <p className="max-w-sm text-reading text-muted-foreground text-pretty">
            New here? Enter your email and you are in. There is no password,
            whether it is your first event or your fiftieth.
          </p>
        </div>

        {hasInvalidLink ? (
          <Alert variant="destructive">
            <IconAlertCircle aria-hidden="true" />
            <AlertTitle>That sign-in link is no longer valid</AlertTitle>
            <AlertDescription>
              It may have expired or already been used. Request a fresh link
              below.
            </AlertDescription>
          </Alert>
        ) : null}

        {isRateLimited ? (
          <Alert variant="destructive">
            <IconAlertCircle aria-hidden="true" />
            <AlertTitle>Too many sign-in attempts</AlertTitle>
            <AlertDescription>
              Wait a minute, then open your sign-in link again.
            </AlertDescription>
          </Alert>
        ) : null}

        <SignInForm callbackURL={safeCallback} initialEmail={invitedEmail} />
      </div>
    </PublicAuthShell>
  );
}
