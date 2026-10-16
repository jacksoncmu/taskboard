import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Popover ----------
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={8}
      className={cn(
        "z-50 max-h-[var(--radix-popover-content-available-height)] w-72 overflow-y-auto rounded-2xl bg-popover p-4 shadow-g2 outline-none data-[state=open]:animate-in scrollbar-thin",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

// ---------- Checkbox (Google Tasks style round check) ----------
export const TaskCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { color?: string }
>(({ className, color, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "group/check peer relative flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground transition-colors",
      "hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary",
      className
    )}
    style={color ? { borderColor: color } : undefined}
    onClick={(e) => e.stopPropagation()}
    onPointerDown={(e) => e.stopPropagation()}
    {...props}
  >
    <Check
      className="size-3 text-primary opacity-0 transition-opacity group-hover/check:opacity-60 group-data-[state=checked]/check:text-primary-foreground group-data-[state=checked]/check:opacity-100"
      strokeWidth={3.5}
    />
  </CheckboxPrimitive.Root>
));
TaskCheckbox.displayName = "TaskCheckbox";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "flex size-[18px] shrink-0 items-center justify-center rounded-[3px] border-2 border-muted-foreground transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check className="size-3.5 text-primary-foreground" strokeWidth={3.5} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

// ---------- Tooltip ----------
export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  side = "bottom",
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[60] rounded-md bg-[#3c4043] px-2 py-1 text-xs text-white shadow-g1 data-[state=delayed-open]:animate-in dark:bg-[#e3e3e3] dark:text-[#1f1f1f]"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ---------- Switch ----------
export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-border-strong bg-surface-3 transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-full bg-muted-foreground transition-transform data-[state=checked]:size-5 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-primary-foreground" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

// ---------- Label ----------
export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium text-foreground", className)} {...props} />
));
Label.displayName = "Label";
