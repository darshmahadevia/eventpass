import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => timestamptz("created_at").defaultNow().notNull();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
});

export const loginCodes = pgTable(
  "login_codes",
  {
    id: id(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_codes_email_idx").on(t.email)],
);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamptz("expires_at").notNull(),
});

export type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  options: string[];
};

export type EventStatus = "draft" | "published" | "cancelled";

export const events = pgTable(
  "events",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    location: text("location").default("").notNull(),
    startsAt: timestamptz("starts_at").notNull(),
    endsAt: timestamptz("ends_at").notNull(),
    timeZone: text("time_zone").notNull(),
    capacity: integer("capacity"),
    status: text("status").$type<EventStatus>().default("draft").notNull(),
    form: jsonb("form").$type<FormField[]>().default([]).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("events_owner_idx").on(t.ownerId)],
);

export const eventStaff = pgTable(
  "event_staff",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.email] }),
    index("event_staff_email_idx").on(t.email),
  ],
);

export type RegistrationStatus = "registered" | "cancelled";

export const registrations = pgTable(
  "registrations",
  {
    id: id(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().default({}).notNull(),
    ticketCode: text("ticket_code").notNull().unique(),
    status: text("status").$type<RegistrationStatus>().default("registered").notNull(),
    checkedInAt: timestamptz("checked_in_at"),
    checkedInBy: text("checked_in_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("registrations_event_idx").on(t.eventId),
    // One active registration per guest email per event; cancelled ones may repeat.
    uniqueIndex("registrations_event_email_active_idx")
      .on(t.eventId, t.email)
      .where(sql`${t.status} = 'registered'`),
  ],
);

export type Event = typeof events.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
