import type { Metadata } from "next";
import { IconAlertCircle, IconMailCheck } from "@tabler/icons-react";

import { PublicAuthShell } from "@/components/public-auth-shell";
import { signOutAction } from "@/app/(workspace)/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PendingLink } from "@/components/pending-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { inspectStaffInvitation } from "@/features/staffing/server/staffing-application";
import { normalizeStaffEmail } from "@/features/staff-identity/normalize-staff-email";
import { getActiveStaffSession } from "@/lib/staff-session";

import { acceptStaffInvitationAction } from "./actions";

export const metadata: Metadata = {
  title: "Staff invitation",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function StaffInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ token }, query, session] = await Promise.all([
    params,
    searchParams,
    getActiveStaffSession(),
  ]);
  const invitation = await inspectStaffInvitation(token);
  const emailMatches =
    invitation && session
      ? normalizeStaffEmail(session.user.email) === invitation.normalizedEmail
      : false;
  const roleLabel =
    invitation?.role === "organizer" ? "Organizer" : "Check-in volunteer";

  return (
    <PublicAuthShell>
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-headline">
            {!invitation || query.error
              ? "Invitation unavailable"
              : "You’re invited"}
          </h1>
        </div>

        {!invitation || query.error ? (
          <Alert variant="destructive">
            <IconAlertCircle aria-hidden="true" />
            <AlertTitle>This link no longer works</AlertTitle>
            <AlertDescription>
              It may have expired or already been used. Ask the organizer to send a new one.
            </AlertDescription>
          </Alert>
        ) : invitation.suspended ? (
          <Alert variant="warning">
            <IconAlertCircle aria-hidden="true" />
            <AlertTitle>Event currently unavailable</AlertTitle>
            <AlertDescription>
              This invitation cannot be accepted while the event is paused.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="panel p-5">
              <p className="text-sm text-muted-foreground">Event</p>
              <p className="mt-1 font-medium">{invitation.eventName}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{roleLabel}</Badge>
                <span className="text-sm text-muted-foreground">
                  {invitation.normalizedEmail}
                </span>
              </div>
            </div>

            {!session ? (
              <div className="flex flex-col gap-3">
                <p className="text-support text-muted-foreground">
                  This invitation is for {invitation.normalizedEmail}. Sign in with that address to accept.
                </p>
                <PendingLink
                  href={`/sign-in?callbackUrl=${encodeURIComponent(`/staff-invitations/${token}`)}`}
                  className={buttonVariants()}
                  pendingLabel="Opening sign in"
                  referrerPolicy="no-referrer"
                >
                  <IconMailCheck data-icon="inline-start" />
                  Sign in to accept
                </PendingLink>
              </div>
            ) : emailMatches ? (
              <form action={acceptStaffInvitationAction.bind(null, token)}>
                <FormSubmitButton
                  className="w-full"
                  pendingLabel="Accepting invitation"
                >
                  Accept invitation
                </FormSubmitButton>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <Alert variant="warning">
                  <IconAlertCircle aria-hidden="true" />
                  <AlertTitle>You are signed in with a different email</AlertTitle>
                  <AlertDescription>
                    This invitation is for {invitation.normalizedEmail}. Sign
                    out, then open the link from your invitation email again.
                  </AlertDescription>
                </Alert>
                <form action={signOutAction}>
                  <FormSubmitButton
                    variant="outline"
                    className="w-full"
                    pendingLabel="Signing out"
                  >
                    Sign out
                  </FormSubmitButton>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicAuthShell>
  );
}
