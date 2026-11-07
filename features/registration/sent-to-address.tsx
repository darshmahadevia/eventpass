"use client";

import { useSyncExternalStore } from "react";

const KEY = "eventpass-sent-to";
const subscribe = () => () => {};

function read() {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

// Held in this tab only. The address stays out of the URL, which is shared,
// logged, and kept in browser history.
export function rememberSentToAddress(email: string) {
  try {
    sessionStorage.setItem(KEY, email.trim());
  } catch {
    // The page simply will not show the address.
  }
}

/** Lets a guest spot a typo while it is still easy to fix. */
export function SentToAddress() {
  const email = useSyncExternalStore(subscribe, read, () => "");
  if (!email) return null;
  return (
    <p className="mt-2 text-sm font-semibold wrap-anywhere">Sent to {email}</p>
  );
}
