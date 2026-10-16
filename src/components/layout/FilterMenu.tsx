import * as React from "react";
import { Check, ListFilter, X } from "lucide-react";
import { PRIORITIES } from "@/models/constants";
import type { ID } from "@/models/types";
import { useAppData } from "@/store/store";
import { useCurrentBoardId, useUI } from "@/store/ui";
import { columnsOf } from "@/store/operations";
import {
  DUE_FILTER_LABELS,
  activeFilterCount,
  type CompletionFilter,
  type DueFilter,
  type TaskFilters,
} from "@/lib/taskQuery";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors",
        active
          ? "border-transparent bg-primary-container font-medium text-on-primary-container"
          : "border-border-strong text-muted-foreground hover:bg-hover"
      )}
    >
      {active ? (
        <Check className="size-3.5" />
      ) : (
        color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
      <span className="truncate">{children}</span>
    </button>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function FilterMenu() {
  const ui = useUI();
  const data = useAppData();
  const boardId = useCurrentBoardId();
  const f = ui.filters;
  const count = activeFilterCount(f);
  const set = (patch: Partial<TaskFilters>) => ui.setFilters((prev) => ({ ...prev, ...patch }));

  // Status options: current board's lists on a board, otherwise every distinct list name.
  const statuses = React.useMemo(() => {
    const cols =
      ui.nav.kind === "board" && ui.scope === "board" && boardId
        ? columnsOf(data, boardId)
        : Object.values(data.columns).sort((a, b) => a.order - b.order);
    const seen = new Map<string, string>();
    for (const c of cols) if (!seen.has(c.name.toLowerCase())) seen.set(c.name.toLowerCase(), c.name);
    return [...seen.entries()];
  }, [data, boardId, ui.nav.kind, ui.scope]);

  const tags = Object.values(data.tags).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={count ? "tonal" : "ghost"}
            size="sm"
            className={cn("h-10 px-3", !count && "text-muted-foreground")}
            aria-label={count ? `Filters (${count} active)` : "Filters"}
          >
            <ListFilter />
            <span className="max-lg:hidden">Filter</span>
            {count > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">Filters</h3>
            <Button variant="text" size="sm" disabled={!count} onClick={ui.clearFilters}>
              Clear all
            </Button>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Show</legend>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "All tasks"],
                  ["incomplete", "Incomplete"],
                  ["completed", "Completed"],
                ] as [CompletionFilter, string][]
              ).map(([v, label]) => (
                <Chip key={v} active={f.completion === v} onClick={() => set({ completion: v })}>
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</legend>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <Chip
                  key={p.value}
                  color={p.color}
                  active={f.priorities.includes(p.value)}
                  onClick={() => set({ priorities: toggle(f.priorities, p.value) })}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due date</legend>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DUE_FILTER_LABELS) as DueFilter[]).map((d) => (
                <Chip key={d} active={f.due.includes(d)} onClick={() => set({ due: toggle(f.due, d) })}>
                  {DUE_FILTER_LABELS[d]}
                </Chip>
              ))}
            </div>
          </fieldset>

          {statuses.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</legend>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map(([key, name]) => (
                  <Chip key={key} active={f.statuses.includes(key)} onClick={() => set({ statuses: toggle(f.statuses, key) })}>
                    {name}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Labels</legend>
            {tags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Chip
                    key={t.id}
                    color={t.color}
                    active={f.tagIds.includes(t.id)}
                    onClick={() => set({ tagIds: toggle<ID>(f.tagIds, t.id) })}
                  >
                    {t.name}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No labels yet.</p>
            )}
          </fieldset>
        </PopoverContent>
      </Popover>
      {count > 0 && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={ui.clearFilters}
          aria-label="Clear filters"
          title="Clear filters"
          className="text-muted-foreground"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
