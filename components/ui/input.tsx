import * as React from "react"

import { cn } from "@/lib/utils"

// Control radius, like every other control. `rounded-3xl` resolves to
// `--radius-overlay`, the radius of a dialog. An input is not an overlay.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 md:h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base transition-[color,box-shadow,background-color,border-color] outline-none hover:border-foreground/40 dark:bg-input/20 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 read-only:bg-muted read-only:text-muted-foreground read-only:hover:border-input disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
