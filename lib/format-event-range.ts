/**
 * Every instant shown to a person is formatted in the Event Time Zone, never
 * the server's or UTC. The Intl construction lives here alone: components
 * are spelled out because `dateStyle`/`timeStyle` cannot be combined with
 * `timeZoneName` — the mix throws "Invalid option : option" before the
 * email is even sent.
 */
const EVENT_FORMAT_OPTIONS = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
} as const;

export function formatEventInstant(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { ...EVENT_FORMAT_OPTIONS, timeZone }).format(instant);
}

export function formatEventRange(startsAt: Date, endsAt: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { ...EVENT_FORMAT_OPTIONS, timeZone }).formatRange(
    startsAt,
    endsAt,
  );
}

/**
 * A schedule for a list row or a ticket, where space is short. One day reads
 * "Fri, Nov 6, 9:05 AM – 1:05 PM EST"; `formatRange` alone turned an event that
 * crosses midnight into "13 Fri, 10:06 PM – 14 Sat", with no month at all.
 */
export function formatCompactRange(startsAt: Date, endsAt: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).formatRange(startsAt, endsAt);
}
