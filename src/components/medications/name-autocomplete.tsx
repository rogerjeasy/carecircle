"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MED_SUGGESTIONS, type MedSuggestion } from "./schema";

export interface NameAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Fired when the user picks a catalog suggestion (lets the form pre-fill form/route/purpose). */
  onSelectSuggestion: (suggestion: MedSuggestion) => void;
  error?: string;
  describedBy?: string;
  invalid?: boolean;
  placeholder?: string;
}

/** Medication-name input with a keyboard-navigable suggestions list (combobox pattern). */
export function NameAutocomplete({
  id,
  value,
  onChange,
  onSelectSuggestion,
  error,
  describedBy,
  invalid,
  placeholder = "Start typing… e.g. Ibuprofen",
}: NameAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const listId = `${id}-listbox`;

  const matches = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return MED_SUGGESTIONS.slice(0, 8);
    return MED_SUGGESTIONS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [value]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (s: MedSuggestion) => {
    onSelectSuggestion(s);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(matches.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % Math.max(matches.length, 1));
    } else if (e.key === "Enter" && active >= 0 && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && matches[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          className={cn("pl-9", error && "border-destructive focus-visible:ring-destructive")}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
        >
          {matches.map((s, i) => (
            <li
              key={s.name}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                i === active ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/60"
              )}
            >
              <span className="truncate font-medium">{s.name}</span>
              {s.purpose && (
                <span className="shrink-0 truncate text-xs text-muted-foreground">{s.purpose}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
