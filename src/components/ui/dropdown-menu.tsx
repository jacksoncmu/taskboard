import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export const DropdownMenuSub = DM.Sub;
export const DropdownMenuRadioGroup = DM.RadioGroup;

const menuSurface =
  "z-50 min-w-[200px] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-xl bg-popover py-2 shadow-g2 data-[state=open]:animate-in scrollbar-thin";

const itemBase =
  "relative flex h-10 cursor-pointer select-none items-center gap-3 px-4 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DM.Content>,
  React.ComponentPropsWithoutRef<typeof DM.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DM.Portal>
    <DM.Content ref={ref} sideOffset={sideOffset} className={cn(menuSurface, className)} {...props} />
  </DM.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DM.Item>,
  React.ComponentPropsWithoutRef<typeof DM.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DM.Item
    ref={ref}
    className={cn(itemBase, destructive && "text-destructive [&_svg]:text-destructive", className)}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DM.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DM.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <DM.CheckboxItem ref={ref} className={cn(itemBase, "pl-11", className)} {...props}>
    <span className="absolute left-4 flex size-[18px] items-center justify-center">
      <DM.ItemIndicator>
        <Check className="!text-primary" />
      </DM.ItemIndicator>
    </span>
    {children}
  </DM.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DM.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DM.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DM.RadioItem ref={ref} className={cn(itemBase, "pl-11", className)} {...props}>
    <span className="absolute left-4 flex size-[18px] items-center justify-center">
      <DM.ItemIndicator>
        <Check className="!text-primary" />
      </DM.ItemIndicator>
    </span>
    {children}
  </DM.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof DM.Label>) {
  return (
    <DM.Label
      className={cn("px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof DM.Separator>) {
  return <DM.Separator className={cn("my-2 h-px bg-border", className)} {...props} />;
}

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DM.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DM.SubTrigger>
>(({ className, children, ...props }, ref) => (
  <DM.SubTrigger ref={ref} className={cn(itemBase, "data-[state=open]:bg-hover", className)} {...props}>
    {children}
    <ChevronRight className="ml-auto" />
  </DM.SubTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DM.SubContent>,
  React.ComponentPropsWithoutRef<typeof DM.SubContent>
>(({ className, ...props }, ref) => (
  <DM.Portal>
    <DM.SubContent ref={ref} className={cn(menuSurface, className)} {...props} />
  </DM.Portal>
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
