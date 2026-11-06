"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";

import type { AdmissionOutcome } from "@/features/admission/server/admission-application";
import { ScanOutcome } from "@/features/admission/scan-outcome";
import { PhoneFrame } from "@/features/landing/phone-frame";

// Named for what happens at the door, not for what the system calls it. The
// phone renders the real outcome, and swaps instantly: a door decision never
// animates in, here or on the scanner.
const SITUATIONS: { outcome: AdmissionOutcome; label: string; tone: string }[] = [
  { outcome: "duplicate", label: "Someone scans twice", tone: "bg-poster-repeat" },
  { outcome: "unknown", label: "Wrong door", tone: "bg-poster-refused" },
  { outcome: "canceled", label: "A canceled ticket", tone: "bg-poster-refused" },
  { outcome: "replaced", label: "An old ticket", tone: "bg-poster-repeat" },
  { outcome: "outside_window", label: "Early arrival", tone: "bg-poster-repeat" },
  { outcome: "conflict", label: "Two phones disagree", tone: "bg-poster-repeat" },
];

export function DoorAnswers({ intro }: { intro: ReactNode }) {
  const [active, setActive] = useState<AdmissionOutcome>("duplicate");

  return (
    <Tabs.Root
      value={active}
      onValueChange={(value) => setActive(value as AdmissionOutcome)}
      orientation="vertical"
      className="grid lg:grid-cols-2"
    >
      <div className="flex flex-col justify-center gap-10 px-4 py-20 sm:px-8 sm:py-28 lg:pr-16">
        {intro}
        <Tabs.List
          activateOnFocus
          aria-label="Situations at the door"
          className="grid grid-cols-2 gap-x-4 gap-y-1 lg:grid-cols-1"
        >
          {SITUATIONS.map(({ label, outcome }) => (
            <Tabs.Tab
              key={outcome}
              value={outcome}
              className="answer-tab flex min-h-11 cursor-pointer items-center gap-4 rounded-md text-left text-2xl leading-tight font-bold tracking-tight text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 data-active:text-foreground sm:text-3xl lg:text-4xl"
            >
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>

      {SITUATIONS.map(({ outcome, tone }) => (
        <Tabs.Panel
          key={outcome}
          value={outcome}
          className={`flex items-center justify-center px-4 py-12 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset ${tone}`}
        >
          <PhoneFrame>
            <ScanOutcome
              outcome={outcome}
              attendeeName="Priya Raman"
              titleAs="p"
            />
          </PhoneFrame>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
