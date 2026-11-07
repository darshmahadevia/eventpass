import "server-only";
import { randomBytes } from "node:crypto";
import { and, like, lt } from "drizzle-orm";
import { startSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { FormField } from "@/lib/db/schema";
import { DEMO_EMAIL_DOMAIN, newTicketCode } from "@/lib/utils";

const FIRST = ["Ava", "Noah", "Mia", "Leo", "Zoe", "Kai", "Ivy", "Eli", "Nora", "Omar", "Ruby", "Sam", "Lena", "Theo", "Maya", "Jude"];
const LAST = ["Patel", "Garcia", "Kim", "Okafor", "Novak", "Silva", "Chen", "Haddad", "Larsen", "Mendes", "Ito", "Byrne"];

const FORM: FormField[] = [
  { id: "company", label: "Company", type: "text", required: false, options: [] },
  { id: "track", label: "Which track are you most excited about?", type: "select", required: true, options: ["Frontend", "Infrastructure", "AI"] },
  { id: "dietary", label: "Dietary requirements", type: "textarea", required: false, options: [] },
];

/** Creates a throwaway account with a populated event and signs into it. Returns the event id. */
export async function startDemo() {
  // Demo accounts are disposable: sweep ones older than a day (events cascade).
  await db
    .delete(schema.users)
    .where(
      and(
        like(schema.users.email, `%@${DEMO_EMAIL_DOMAIN}`),
        lt(schema.users.createdAt, new Date(Date.now() - 86_400_000)),
      ),
    );

  const suffix = randomBytes(4).toString("hex");
  const [user] = await db
    .insert(schema.users)
    .values({ email: `demo-${suffix}@${DEMO_EMAIL_DOMAIN}` })
    .returning();
  if (!user) throw new Error("Could not create demo user");

  // Doors opened an hour ago, so the dashboard shows a check-in in progress.
  const now = Date.now();
  const [event] = await db
    .insert(schema.events)
    .values({
      ownerId: user.id,
      slug: `demo-${suffix}`,
      title: "Local Dev Meetup: Offline-first Web",
      description:
        "An evening of short talks on building web apps that survive flaky networks, followed by pizza and conversation.",
      location: "The Commons, 120 Market St",
      startsAt: new Date(now - 60 * 60_000),
      endsAt: new Date(now + 3 * 60 * 60_000),
      timeZone: "America/New_York",
      capacity: 80,
      status: "published",
      form: FORM,
    })
    .returning();
  if (!event) throw new Error("Could not create demo event");

  const tracks = ["Frontend", "Infrastructure", "AI"];
  await db.insert(schema.registrations).values(
    Array.from({ length: 46 }, (_, i) => {
      const first = FIRST[i % FIRST.length]!;
      const last = LAST[(i * 7) % LAST.length]!;
      const cancelled = i === 5 || i === 17;
      const checkedIn = !cancelled && i % 3 !== 0;
      return {
        eventId: event.id,
        name: `${first} ${last}`,
        email: `${first}.${last}${i}@example.com`.toLowerCase(),
        answers: { track: tracks[i % 3]!, ...(i % 4 === 0 ? { company: "Acme Labs" } : {}) },
        ticketCode: newTicketCode(),
        status: cancelled ? ("cancelled" as const) : ("registered" as const),
        checkedInAt: checkedIn ? new Date(now - (60 - i) * 60_000) : null,
        checkedInBy: checkedIn ? user.email : null,
        createdAt: new Date(now - (10 - (i % 10)) * 86_400_000),
      };
    }),
  );

  await startSession(user.id);
  return event.id;
}
