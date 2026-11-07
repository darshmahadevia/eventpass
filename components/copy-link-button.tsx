"use client";

import { useState } from "react";
import { IconCheck, IconLink } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

/**
 * Copies a same-origin path as a full link. The label is the confirmation, so
 * the feedback lands where the person is already looking.
 */
export function CopyLinkButton({
  path,
  label = "Copy public link",
  className,
  variant = "outline",
}: {
  path: string;
  label?: string;
  className?: string;
  variant?: "outline" | "default" | "ghost";
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        new URL(path, window.location.origin).href,
      );
      setState("copied");
      window.setTimeout(() => setState("idle"), 2_000);
    } catch {
      setState("failed");
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => void copy()}
    >
      {state === "copied" ? (
        <IconCheck data-icon="inline-start" />
      ) : (
        <IconLink data-icon="inline-start" />
      )}
      <span aria-live="polite">
        {state === "copied"
          ? "Link copied"
          : state === "failed"
            ? "Copy failed. Open the page instead"
            : label}
      </span>
    </Button>
  );
}
