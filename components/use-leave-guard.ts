"use client";

import { useEffect } from "react";

const MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * Warns before unsaved work is lost. `beforeunload` covers a reload or closing
 * the tab, but in-app links never fire it, so a click on one is checked too.
 */
export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const warnOnUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const warnOnLink = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.hash && link.pathname === location.pathname) return;
      if (!window.confirm(MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", warnOnUnload);
    document.addEventListener("click", warnOnLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnOnUnload);
      document.removeEventListener("click", warnOnLink, true);
    };
  }, [dirty]);
}
