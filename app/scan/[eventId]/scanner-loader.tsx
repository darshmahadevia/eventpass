"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

// Client-only: the scanner's state lives in this device's localStorage.
const Scanner = dynamic(() => import("./scanner"), {
  ssr: false,
  loading: () => <p className="p-8 text-center text-muted">Loading scanner…</p>,
});

const CACHE = "eventpass-v1";

/**
 * Registers the service worker and stores this page plus its scripts, so the
 * scanner still opens if the phone reloads it with no network.
 */
function useOfflineShell() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void import("@zxing/browser"); // fetch the camera decoder now so it's cached for offline use
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => new Promise((resolve) => setTimeout(resolve, 2000)))
      .then(async () => {
        const assets = performance
          .getEntriesByType("resource")
          .map((entry) => new URL(entry.name))
          .filter((url) => url.origin === location.origin && url.pathname.startsWith("/_next/static/"))
          .map((url) => url.href);
        const cache = await caches.open(CACHE);
        await Promise.all([location.pathname, ...assets].map((url) => cache.add(url).catch(() => {})));
      })
      .catch(() => {});
  }, []);
}

export function ScannerLoader(props: { eventId: string; title: string; timeZone: string; backHref: string }) {
  useOfflineShell();
  return <Scanner {...props} />;
}
