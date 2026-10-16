import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-sm text-foreground placeholder:text-subtle-foreground transition-colors",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-border-strong bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-subtle-foreground transition-colors resize-y",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 rounded-lg border border-border-strong bg-surface px-2.5 pr-8 text-sm text-foreground transition-colors",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  )
);
NativeSelect.displayName = "NativeSelect";
