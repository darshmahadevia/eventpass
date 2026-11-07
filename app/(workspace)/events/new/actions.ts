"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createDraftEvent,
  createDraftEventInputSchema,
} from "@/features/events/server/create-draft-event";
import { isUniqueViolation } from "@/lib/is-unique-violation";
import { getActiveStaffSession } from "@/lib/staff-session";
import {
  getDefaultEventWindows,
  presentEventErrors,
} from "@/features/events/event-window-defaults";
import {
  isIanaTimeZone,
  utcToLocalDateTimeInput,
} from "@/features/events/server/event-schedule";

import type { CreateEventFormField, CreateEventFormState } from "./form-state";

export type { CreateEventFormField, CreateEventFormState };

function formValue(formData: FormData, name: CreateEventFormField) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function createEventAction(
  _previousState: CreateEventFormState,
  formData: FormData,
): Promise<CreateEventFormState> {
  const staffSession = await getActiveStaffSession();

  if (!staffSession) {
    redirect("/sign-in");
  }

  const inputValues = {
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    slug: formValue(formData, "slug"),
    eventTimeZone: formValue(formData, "eventTimeZone"),
    startsAtLocal: formValue(formData, "startsAtLocal"),
    endsAtLocal: formValue(formData, "endsAtLocal"),
    venueName: formValue(formData, "venueName"),
    venueAddress: formValue(formData, "venueAddress"),
    venueMapUrl: formValue(formData, "venueMapUrl"),
    capacity: formValue(formData, "capacity"),
    registrationOpensAtLocal: formValue(formData, "registrationOpensAtLocal"),
    registrationClosesAtLocal: formValue(formData, "registrationClosesAtLocal"),
    checkInOpensAtLocal: formValue(formData, "checkInOpensAtLocal"),
    checkInClosesAtLocal: formValue(formData, "checkInClosesAtLocal"),
  } satisfies Record<CreateEventFormField, string>;
  // "Now" has to be read in the zone the organizer just chose. The form cannot
  // supply it: it does not know the zone until it is submitted.
  const values = {
    ...inputValues,
    ...getDefaultEventWindows(
      inputValues,
      isIanaTimeZone(inputValues.eventTimeZone)
        ? utcToLocalDateTimeInput(new Date(), inputValues.eventTimeZone)
        : "",
    ),
  };
  const validation = createDraftEventInputSchema.safeParse(values);

  if (!validation.success) {
    return {
      status: "error",
      message: "Review the highlighted fields and try again.",
      fieldErrors: presentEventErrors(
        validation.error.flatten().fieldErrors,
        inputValues,
      ),
      values: inputValues,
    };
  }

  let created;
  try {
    created = await createDraftEvent(staffSession.user.id, values);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const message = "That web address is taken. Try another.";
      return {
        status: "error",
        message,
        fieldErrors: { slug: [message] },
        values: inputValues,
      };
    }
    return {
      status: "error",
      message: "The draft could not be created. Try again.",
      values: inputValues,
    };
  }

  revalidatePath("/events");
  // Straight into the draft: the next step is to finish and publish it, and the
  // list was a detour that made the organizer find what they just made.
  redirect(`/events/${created.id}`);
}
