import * as React from "react"

import { cn } from "@/lib/utils"

// Control radius. This was on `--radius-container`, which made a textarea a
// third radius in a form that already had a 6px button and a 16px input.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-base transition-[color,box-shadow,background-color,border-color] outline-none hover:border-foreground/40 dark:bg-input/20 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
