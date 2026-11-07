import assert from "node:assert/strict";
import { test } from "node:test";
import { utcToZoned, zonedToUtc } from "../lib/time.ts";

test("converts wall-clock time in a zone to UTC and back, across DST", () => {
  assert.equal(zonedToUtc("2026-01-15T19:30", "America/New_York")?.toISOString(), "2026-01-16T00:30:00.000Z");
  assert.equal(zonedToUtc("2026-07-15T19:30", "America/New_York")?.toISOString(), "2026-07-15T23:30:00.000Z");
  assert.equal(zonedToUtc("2026-03-29T09:00", "Asia/Kolkata")?.toISOString(), "2026-03-29T03:30:00.000Z");
  assert.equal(utcToZoned(new Date("2026-07-15T23:30:00Z"), "America/New_York"), "2026-07-15T19:30");
  assert.equal(zonedToUtc("not a date", "UTC"), null);
});
