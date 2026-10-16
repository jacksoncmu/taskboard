import * as React from "react";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import type { ID } from "@/models/types";
import { TAG_COLORS } from "@/models/constants";
import { useAppData } from "@/store/store";
import { actions } from "@/store/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/misc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Label color">
      {TAG_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={value === c.value}
          aria-label={c.name}
          title={c.name}
          onClick={() => onChange(c.value)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110",
            value === c.value && "ring-2 ring-offset-2 ring-offset-popover"
          )}
          style={{ background: c.value, ["--tw-ring-color" as string]: c.value }}
        >
          {value === c.value && <Check className="size-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

export function TagPicker({
  selected,
  onChange,
  trigger,
}: {
  selected: ID[];
  onChange: (ids: ID[]) => void;
  trigger?: React.ReactNode;
}) {
  const data = useAppData();
  const [query, setQuery] = React.useState("");
  const [color, setColor] = React.useState(TAG_COLORS[6].value);
  const tags = Object.values(data.tags).sort((a, b) => a.name.localeCompare(b.name));
  const q = query.trim().toLowerCase();
  const visible = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
  const exact = tags.some((t) => t.name.toLowerCase() === q);

  const toggle = (id: ID) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const create = () => {
    if (!q || exact) return;
    const id = actions.addTag(query, color);
    onChange([...selected, id]);
    setQuery("");
  };

  return (
    <Popover onOpenChange={(o) => !o && setQuery("")}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <TagIcon /> Add label
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <div className="p-3 pb-2">
          <Input
            autoFocus
            placeholder="Search or create label"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (visible.length === 1 && !exact) toggle(visible[0].id);
                else if (exact) toggle(tags.find((t) => t.name.toLowerCase() === q)!.id);
                else create();
              }
            }}
            className="h-9"
          />
        </div>
        <div className="max-h-56 overflow-y-auto pb-2 scrollbar-thin">
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-hover"
            >
              <span className="size-3 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="flex-1 truncate">{t.name}</span>
              {selected.includes(t.id) && <Check className="size-4 text-primary" />}
            </button>
          ))}
          {!visible.length && !q && (
            <p className="px-4 py-2 text-sm text-muted-foreground">No labels yet. Type a name to create one.</p>
          )}
        </div>
        {q && !exact && (
          <div className="space-y-3 border-t p-3">
            <ColorSwatches value={color} onChange={setColor} />
            <Button size="sm" variant="tonal" className="w-full" onClick={create}>
              <Plus /> Create “{query.trim()}”
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
