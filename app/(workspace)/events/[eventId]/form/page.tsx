import { getOwnedEvent } from "@/lib/events";
import { saveFormAction } from "../../actions";
import { FormBuilder } from "./form-builder";

export const metadata = { title: "Registration form" };

export default async function FormPage({ params }: PageProps<"/events/[eventId]/form">) {
  const { eventId } = await params;
  const { event } = await getOwnedEvent(eventId);
  return (
    <div className="mx-auto max-w-2xl">
      <FormBuilder saveForm={saveFormAction.bind(null, event.id)} initial={event.form} />
    </div>
  );
}
