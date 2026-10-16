import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text field that keeps a local draft and commits it to the store on blur, on Enter (single-line),
 * and after a short idle pause — so typing stays smooth while changes are still saved promptly.
 */
export function CommitTextarea({
  value,
  onCommit,
  multiline = true,
  className,
  placeholder,
  ariaLabel,
  autoFocus,
  onEnter,
  allowEmpty = true,
  idleMs = 700,
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  allowEmpty?: boolean;
  idleMs?: number;
}) {
  const [draft, setDraft] = React.useState(value);
  const focused = React.useRef(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const timer = React.useRef<number>();
  const latest = React.useRef({ draft, value, onCommit });
  latest.current = { draft, value, onCommit };

  React.useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  const commit = React.useCallback(() => {
    window.clearTimeout(timer.current);
    const { draft: d, value: v, onCommit: c } = latest.current;
    if (d === v) return;
    if (!allowEmpty && !d.trim()) {
      setDraft(v);
      return;
    }
    c(d);
  }, [allowEmpty]);

  // Commit pending edits when unmounting (e.g. the panel closes).
  React.useEffect(() => () => commit(), [commit]);

  // Auto-grow.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={draft}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onChange={(e) => {
        const v = multiline ? e.target.value : e.target.value.replace(/\n/g, " ");
        setDraft(v);
        window.clearTimeout(timer.current);
        if (allowEmpty || v.trim()) timer.current = window.setTimeout(commit, idleMs);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          commit();
          onEnter?.();
        }
        if (e.key === "Escape") {
          commit();
        }
      }}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-subtle-foreground",
        className
      )}
    />
  );
}
