import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

/** "This board" / "All boards" segmented control for list and calendar views. */
export function ScopeToggle() {
  const ui = useUI();
  return (
    <div className="inline-flex h-9 rounded-full border border-border-strong p-0.5" role="radiogroup" aria-label="Scope">
      {(
        [
          ["board", "This board"],
          ["all", "All boards"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          role="radio"
          aria-checked={ui.scope === value}
          onClick={() => ui.setScope(value)}
          className={cn(
            "rounded-full px-3 text-sm transition-colors",
            ui.scope === value
              ? "bg-primary-container font-medium text-on-primary-container"
              : "text-muted-foreground hover:bg-hover"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
