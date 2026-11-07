"use client";

import { IconCheck, IconCopy, IconPrinter, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className="min-w-32"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <IconCheck className="size-4 text-success" /> : <IconCopy className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </Button>
  );
}

/** Re-fetches server data on an interval so dashboards stay live during doors. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

export function Tabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Event sections" className="-mb-px flex gap-7 overflow-x-auto [scrollbar-width:none]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative py-3.5 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:rounded-t-sm after:bg-accent after:transition-transform after:duration-200 after:ease-out-soft",
              active ? "text-fg after:scale-x-100" : "text-muted after:scale-x-0 hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <IconPrinter className="size-4" /> Print
    </Button>
  );
}

export type ModalHandle = { open: () => void; close: () => void };

/** A native dialog: focus trap, Escape, and top-layer stacking come from the browser. */
export function Modal({
  ref,
  title,
  children,
}: {
  ref: React.Ref<ModalHandle>;
  title: string;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => ({
    open: () => dialog.current?.showModal(),
    close: () => dialog.current?.close(),
  }));

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label={title}
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close(); // the backdrop
      }}
    >
      <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="display text-2xl">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            <IconX className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
