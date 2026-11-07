// Event times are stored as UTC instants and shown in the event's own time zone.

function offsetMs(date: Date, timeZone: string) {
  const parts: Record<string, number> = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)]),
  );
  const { year = 0, month = 1, day = 1, hour = 0, minute = 0, second = 0 } = parts;
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-03-14T19:30" wall-clock time in `timeZone` → UTC Date. */
export function zonedToUtc(local: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as number[];
  const guess = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  // Two passes settle DST boundaries.
  let utc = guess - offsetMs(new Date(guess), timeZone);
  utc = guess - offsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

/** UTC Date → "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone`, for datetime-local inputs. */
export function utcToZoned(date: Date, timeZone: string): string {
  return new Date(date.getTime() + offsetMs(date, timeZone)).toISOString().slice(0, 16);
}

export function formatEventRange(start: Date, end: Date, timeZone: string) {
  const range = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).formatRange(start, end);
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(start)
    .find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${range} ${zone}` : range;
}

export function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
}

/** Pieces of a start time for ticket stubs, where the date is set large. */
export function dateParts(date: Date, timeZone: string) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
  return {
    weekday: part({ weekday: "short" }),
    month: part({ month: "short" }),
    day: part({ day: "numeric" }),
    year: part({ year: "numeric" }),
  };
}

/** "7:00 – 10:00 PM EST", or just the date range when an event spans days. */
export function formatTimeRange(start: Date, end: Date, timeZone: string) {
  const sameDay = utcToZoned(start, timeZone).slice(0, 10) === utcToZoned(end, timeZone).slice(0, 10);
  const range = new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  }).formatRange(start, end);
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(start)
    .find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${range} ${zone}` : range;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
