import { twMerge } from "tailwind-merge";

/** Joins class names; later Tailwind utilities override conflicting earlier ones. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

// Crockford base32: no I, L, O, U, so codes survive being read aloud or typed.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** 16 characters ≈ 80 bits: unguessable, so a ticket code can double as its URL. */
export function newTicketCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
}

/** Accepts a raw code, a grouped "ABCD-EFGH-…" code, or a ticket URL. */
export function normalizeTicketCode(input: string) {
  const last = input.trim().split("/").filter(Boolean).pop() ?? "";
  return last
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export const formatTicketCode = (code: string) => code.match(/.{1,4}/g)?.join("-") ?? code;

/** Only same-site paths, so `?next=` can't redirect off-site. */
export function safeRedirectPath(value: unknown, fallback = "/events") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

export const DEMO_EMAIL_DOMAIN = "demo.eventpass.invalid";
export const isDemoEmail = (email: string) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
