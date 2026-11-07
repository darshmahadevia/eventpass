"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useEffect, useSyncExternalStore } from "react";
import { THEME_KEY, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const CHANGE = "eventpass:theme-change";

const currentTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function paint(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#ffffff" : "#000000");
}

/** Switches theme, revealing the new one in a circle that grows out of the toggle. */
function choose(theme: Theme, origin: HTMLElement) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  const apply = () => {
    paint(theme);
    window.dispatchEvent(new Event(CHANGE));
  };
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();

  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document
    .startViewTransition(apply)
    .ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

const subscribe = (notify: () => void) => {
  window.addEventListener(CHANGE, notify);
  return () => window.removeEventListener(CHANGE, notify);
};

/** Keeps the browser chrome matched to the page. */
export function ThemeColorSync() {
  useEffect(() => paint(currentTheme()), []);
  return null;
}

/** One switch: the knob carries the current theme's icon and slides to the other side. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "dark" as Theme);
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={(e) => choose(dark ? "light" : "dark", e.currentTarget)}
      className={cn(
        "no-print group relative inline-flex h-9 w-[4.25rem] shrink-0 items-center rounded-full border border-line-strong bg-surface p-[3px] transition-colors hover:border-faint",
        className,
      )}
    >
      {/* The far side shows where a tap will take you. */}
      <IconSun aria-hidden stroke={2} className={cn("absolute left-2.5 size-4 text-faint transition-opacity", !dark && "opacity-0")} />
      <IconMoon aria-hidden stroke={2} className={cn("absolute right-2.5 size-4 text-faint transition-opacity", dark && "opacity-0")} />
      <span
        aria-hidden
        className={cn(
          "relative grid size-7 place-items-center rounded-full bg-fg text-bg shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-300 ease-spring",
          dark && "translate-x-[2rem]",
        )}
      >
        {dark ? <IconMoon className="size-4" stroke={2.2} /> : <IconSun className="size-4" stroke={2.2} />}
      </span>
    </button>
  );
}
