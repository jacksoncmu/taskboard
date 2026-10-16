import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        filled: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-g1",
        tonal: "bg-primary-container text-on-primary-container hover:shadow-g1",
        outline: "border border-border-strong text-primary hover:bg-accent",
        text: "text-primary hover:bg-accent",
        ghost: "text-foreground hover:bg-hover active:bg-pressed",
        destructive: "bg-destructive text-white hover:opacity-90 dark:text-[#601410]",
        fab: "bg-surface text-foreground shadow-g2 hover:shadow-g3 rounded-2xl",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 px-4 text-[13px]",
        lg: "h-14 px-5 text-base",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "filled", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
