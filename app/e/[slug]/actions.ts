"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getPublishedEvent } from "@/features/events/server/get-event";
import { findConfirmedRegistration } from "@/features/registration/server/get-public-registration-form";
import { submitRegistration } from "@/features/registration/server/submit-registration";
import { resendTicketForRegistration } from "@/features/tickets/server/tickets";

import type { RegistrationActionState } from "./form-state";

export type { RegistrationActionState };

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Answers the same way whether or not the address has a ticket, so this can't
 * be used to learn who is coming.
 */
export async function requestTicketEmailAction(
  slug: string,
  _previousMessage: string,
  formData: FormData,
): Promise<string> {
  const email = stringValue(formData, "email").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter your full email address.";

  const event = await getPublishedEvent(slug);
  if (event) {
    const registrationId = await findConfirmedRegistration(event.id, email);
    if (registrationId) {
      await resendTicketForRegistration(registrationId, event.id).catch(
        () => undefined,
      );
    }
  }
  return "If that address has a ticket, it is on its way. Check your spam folder too.";
}

export async function submitRegistrationAction(
  slug: string,
  fieldIds: string[],
  _previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  if (stringValue(formData, "website").trim()) {
    redirect(`/e/${slug}/check-email?outcome=neutral`);
  }

  // Bound action args travel through the client, so only well-formed field
  // identifiers shape the answers. Unknown keys are ignored downstream.
  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const safeFieldIds = fieldIds.filter((fieldId) => UUID_PATTERN.test(fieldId)).slice(0, 100);

  const answers = Object.fromEntries(
    safeFieldIds.map((fieldId) => {
      const values = formData
        .getAll(`answer.${fieldId}`)
        .filter((value): value is string => typeof value === "string");
      return [fieldId, values.length > 1 ? values : (values[0] ?? "")];
    }),
  );
  const values = {
    name: stringValue(formData, "name"),
    email: stringValue(formData, "email"),
    answers,
  };

  let result;
  try {
    result = await submitRegistration(slug, values, await headers());
  } catch {
    return {
      status: "error",
      message: "Your registration could not be sent. Try again.",
      values,
    };
  }

  if (result.outcome === "invalid") {
    return {
      status: "error",
      message: "Review the highlighted fields and try again.",
      fieldErrors: result.fieldErrors,
      values: result.values,
    };
  }
  if (result.outcome === "existing_registration") {
    redirect(`/e/${slug}/check-email?outcome=neutral`);
  }
  if (result.outcome === "rate_limited") {
    return {
      status: "error",
      message: "Too many tries with this email. Wait an hour, or use Get your ticket again below.",
      values,
    };
  }
  if (result.outcome === "registration_closed") {
    return {
      status: "error",
      message: "Registration is not currently open for this event.",
      values,
    };
  }
  if (result.outcome === "event_unavailable") {
    return {
      status: "error",
      message: "This event is currently unavailable.",
      values,
    };
  }

  const delivery =
    result.deliveryStatus === "failed" ? "&delivery=failed" : "";
  if (result.outcome === "capacity_hold") {
    redirect(`/e/${slug}/check-email?outcome=hold${delivery}`);
  }
  redirect(`/e/${slug}/check-email?outcome=waitlist${delivery}`);
}
