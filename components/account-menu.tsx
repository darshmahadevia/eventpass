"use client";

import { useRef } from "react";
import { Menu } from "@base-ui/react/menu";
import { IconCheck, IconChevronDown, IconLogout } from "@tabler/icons-react";

import { useThemeMode } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

const ITEM =
  "flex min-h-11 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground md:min-h-10";

/**
 * Who you are, how the product looks, and the way out. Theme and sign-out sat
 * in the header as peers of the navigation, which on a phone left no room for
 * the navigation and no sign of which account was signed in.
 */
export function AccountMenu({
  email,
  name,
  signOutAction,
}: {
  email: string;
  name?: string | null;
  signOutAction: () => void | Promise<void>;
}) {
  const { theme, setTheme, options } = useThemeMode();
  const signOutForm = useRef<HTMLFormElement>(null);
  const initial = (name?.trim() || email).slice(0, 1).toUpperCase();

  return (
    <>
      {/* Outside the popup: the popup unmounts as it closes, and the submit has
          to survive that. */}
      <form ref={signOutForm} action={signOutAction} hidden />
      <Menu.Root>
        <Menu.Trigger
          className="flex min-h-11 items-center gap-2 rounded-md px-1.5 text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:bg-muted"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          >
            {initial}
          </span>
          <span className="sr-only">Account menu for </span>
          <span className="max-w-52 truncate font-normal text-muted-foreground max-md:sr-only">
            {email}
          </span>
          <IconChevronDown
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-50 outline-none" align="end" sideOffset={6}>
            <Menu.Popup
              className={cn(
                "w-64 origin-(--transform-origin) rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none",
                "transition-[opacity,transform] duration-(--duration-quick) ease-(--ease-smooth-out) data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              )}
            >
              <div className="px-2.5 pt-1.5 pb-2">
                {name?.trim() ? (
                  <p className="truncate text-sm font-semibold">{name}</p>
                ) : null}
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              </div>
              <Menu.Separator className="-mx-1.5 my-1 h-px bg-border" />
              <Menu.Group>
                <Menu.GroupLabel className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-muted-foreground">
                  Theme
                </Menu.GroupLabel>
                <Menu.RadioGroup
                  value={theme}
                  onValueChange={(mode) => setTheme(mode)}
                >
                  {options.map(({ icon: Icon, label, mode }) => (
                    <Menu.RadioItem
                      key={mode}
                      value={mode}
                      closeOnClick
                      className={ITEM}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      <span className="flex-1">{label}</span>
                      <Menu.RadioItemIndicator>
                        <IconCheck aria-hidden="true" className="size-4" />
                      </Menu.RadioItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Group>
              <Menu.Separator className="-mx-1.5 my-1 h-px bg-border" />
              <Menu.Item
                className={ITEM}
                onClick={() => signOutForm.current?.requestSubmit()}
              >
                <IconLogout aria-hidden="true" className="size-4" />
                Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}
