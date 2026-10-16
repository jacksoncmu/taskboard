/** App mark drawn with CSS/SVG — intentionally not any Google logo. */
export function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#1a73e8" />
        <rect x="9" y="10" width="6" height="20" rx="3" fill="#fff" opacity="0.55" />
        <rect x="17" y="10" width="6" height="14" rx="3" fill="#fff" opacity="0.8" />
        <rect x="25" y="10" width="6" height="9" rx="3" fill="#fff" />
      </svg>
      <span className="text-[22px] tracking-tight text-muted-foreground">
        <span className="text-foreground">Task</span>board
      </span>
    </div>
  );
}
