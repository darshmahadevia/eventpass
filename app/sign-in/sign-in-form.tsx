"use client";

import { useActionState, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice } from "@/components/ui";
import { cn } from "@/lib/utils";
import { signInAction } from "./actions";

export function SignInForm({ next }: { next?: string }) {
  // Remounting clears the action state, which is how "use a different email" starts over.
  const [attempt, setAttempt] = useState(0);
  return <Flow key={attempt} next={next} restart={() => setAttempt((n) => n + 1)} />;
}

function Flow({ next, restart }: { next?: string; restart: () => void }) {
  const [state, action] = useActionState(signInAction, {});
  const [resent, setResent] = useState(false);

  if (!state.email) {
    return (
      <form action={action} className="grid gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" error={state.error}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="you@example.com"
            aria-invalid={!!state.error}
            className="h-12"
          />
        </Field>
        <SubmitButton pendingText="Sending code…" className="h-12">
          Email me a code
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="grid gap-5">
      <p className="text-muted">
        Enter the 6-digit code we sent to <strong className="font-semibold break-all text-fg">{state.email}</strong>.
      </p>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="email" value={state.email} />
        <CodeInput invalid={!!state.error} />
        {state.error && <Notice tone="danger">{state.error}</Notice>}
        <SubmitButton pendingText="Checking…" className="h-12">
          Sign in
        </SubmitButton>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" onClick={restart} className="font-medium text-muted underline-offset-4 hover:text-fg hover:underline">
          Use a different email
        </button>
        <form action={action} onSubmit={() => setResent(true)}>
          <input type="hidden" name="next" value={next ?? ""} />
          <input type="hidden" name="email" value={state.email} />
          <button className="font-medium text-muted underline-offset-4 hover:text-fg hover:underline">
            {resent ? "New code sent" : "Send a new code"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** One real input for autofill and paste, drawn as six ticket-sized cells. Submits itself when full. */
function CodeInput({ invalid }: { invalid: boolean }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(true);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, i) => {
          const current = focused && (i === value.length || (i === 5 && value.length === 6));
          return (
            <div
              key={i}
              className={cn(
                "grid h-16 place-items-center rounded-xl border bg-transparent font-mono text-2xl font-medium transition-[border-color,box-shadow] duration-150",
                invalid ? "border-danger" : current ? "border-accent-text ring-3 ring-accent/25" : "border-line-strong",
              )}
            >
              {value[i]}
            </div>
          );
        })}
      </div>
      <input
        ref={input}
        name="code"
        aria-label="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
          setValue(digits);
          if (digits.length === 6) input.current?.form?.requestSubmit();
        }}
        className="absolute inset-0 size-full bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  );
}
