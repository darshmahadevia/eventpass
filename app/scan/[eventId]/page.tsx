import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { canScan } from "@/lib/events";
import { ScannerLoader } from "./scanner-loader";

export const metadata = { title: "Door scanner" };

export default async function ScanPage({ params }: PageProps<"/scan/[eventId]">) {
  const { eventId } = await params;
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=/scan/${eventId}`);
  const event = await canScan(user, eventId);
  if (!event) notFound();

  return (
    <ScannerLoader
      eventId={event.id}
      title={event.title}
      timeZone={event.timeZone}
      backHref={event.ownerId === user.id ? `/events/${event.id}` : "/events"}
    />
  );
}
