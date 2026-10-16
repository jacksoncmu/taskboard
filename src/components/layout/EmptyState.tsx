import type * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <div className="relative mb-6">
        <div className="absolute -left-6 -top-3 size-10 rounded-full bg-[#fbbc04]/25" aria-hidden />
        <div className="absolute -bottom-2 -right-7 size-8 rounded-lg bg-[#34a853]/25 rotate-12" aria-hidden />
        <div className="relative flex size-28 items-center justify-center rounded-full bg-primary-container">
          <Icon className="size-12 text-on-primary-container" strokeWidth={1.5} />
        </div>
      </div>
      <h2 className="text-xl font-normal text-foreground">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
