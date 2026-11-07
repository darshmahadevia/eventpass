import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronLeft,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:brightness-105",
  secondary: "border border-line-strong text-fg hover:border-fg hover:bg-raised",
  ghost: "text-fg hover:bg-raised",
  danger: "border border-danger/50 text-danger hover:border-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-11 gap-2 rounded-xl px-4 text-[0.9375rem]",
  lg: "h-14 gap-2.5 rounded-2xl px-7 text-lg",
};

export function buttonClass(variant: Variant = "primary", className?: string, size: Size = "md") {
  return cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-[background-color,border-color,color,filter,transform] duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    sizes[size],
    variants[variant],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, className, size)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, className, size)} {...props} />;
}

const fieldClass =
  "w-full rounded-xl border border-line-strong bg-transparent px-3.5 text-base text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint hover:border-faint focus:border-accent-text focus:ring-3 focus:ring-accent/25 focus-visible:outline-none aria-invalid:border-danger sm:text-[0.9375rem]";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select className={cn(fieldClass, "h-11 appearance-none truncate pr-10", className)} {...props} />
      <IconChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="text-sm text-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** A real checkbox drawn as a switch, so forms and screen readers need nothing special. */
export function Switch({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      role="switch"
      className={cn(
        "relative h-6 w-10 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors duration-150 checked:bg-accent",
        "after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform after:duration-200 after:ease-out-soft checked:after:translate-x-4 checked:after:bg-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-surface", className)} {...props} />;
}

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  accent: "bg-accent-soft text-accent-text",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  live,
  children,
}: {
  tone?: Tone;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full bg-current", live && "live-dot")} />
      {children}
    </span>
  );
}

const noticeIcons = {
  neutral: IconInfoCircle,
  accent: IconInfoCircle,
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  danger: IconAlertTriangle,
};

export function Notice({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = noticeIcons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm leading-snug",
        tones[tone],
        tone === "neutral" && "text-fg",
        className,
      )}
    >
      <Icon aria-hidden className="mt-px size-[1.125rem] shrink-0" stroke={2} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex items-center gap-0.5 rounded-md pr-1 text-sm font-medium text-muted transition-colors hover:text-fg"
    >
      <IconChevronLeft aria-hidden className="size-4" stroke={2.2} />
      {children}
    </Link>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xl text-fg", className)}>
      <svg viewBox="0 0 32 22" className="h-[0.8em] w-auto -rotate-6 text-accent" fill="currentColor" aria-hidden>
        <path d="M3 0h26a3 3 0 0 1 3 3v4.6a3.4 3.4 0 0 0 0 6.8V19a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3v-4.6a3.4 3.4 0 0 0 0-6.8V3a3 3 0 0 1 3-3Z" />
        <path d="M21 3.5v2M21 8v2M21 12.500v2M21 17v2" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="display leading-none">EventPass</span>
    </span>
  );
}

export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 className={cn("display text-4xl sm:text-5xl", className)} {...props} />;
}

/** A thin progress rail. `tone` picks the fill; the track is always neutral. */
export function Meter({
  value,
  max,
  tone = "accent",
  label,
  className,
}: {
  value: number;
  max: number;
  tone?: "accent" | "go";
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 overflow-hidden rounded-full bg-raised", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out-soft",
          tone === "go" ? "bg-success" : "bg-accent",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Avatar({ name, tone = "neutral" }: { name: string; tone?: "neutral" | "success" | "danger" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold",
        tone === "success" ? "bg-success-soft text-success" : tone === "danger" ? "bg-danger-soft text-danger" : "bg-raised text-muted",
      )}
    >
      {initials || "?"}
    </span>
  );
}
