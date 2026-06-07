"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface ChipInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}

export function ChipInput({ label, value, onChange, suggestions, placeholder }: ChipInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const trimmed = inputValue.trim();

  const visibleSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s))
    .slice(0, 8);

  // Offer a custom entry when the typed text matches neither an already-added
  // chip nor an existing suggestion — so users can add their own value.
  const canAddCustom =
    trimmed.length > 0 &&
    !value.some((v) => v.toLowerCase() === trimmed.toLowerCase()) &&
    !visibleSuggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  // Flat list of everything the user can select/add, in render order. The
  // custom "Add …" row (if present) is always last. Used for keyboard nav.
  const options = canAddCustom ? [...visibleSuggestions, trimmed] : visibleSuggestions;

  // Keep the keyboard highlight in range as the options list changes.
  React.useEffect(() => {
    setHighlightedIndex((i) => (i >= options.length ? options.length - 1 : i));
  }, [options.length]);

  const addChip = (chip: string) => {
    if (chip.trim() && !value.includes(chip.trim())) {
      onChange([...value, chip.trim()]);
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeChip = (chip: string) => {
    onChange(value.filter((v) => v !== chip));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((i) => (options.length === 0 ? -1 : (i + 1) % options.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((i) => (options.length === 0 ? -1 : (i - 1 + options.length) % options.length));
    } else if (e.key === "Enter") {
      if (showSuggestions && highlightedIndex >= 0 && options[highlightedIndex]) {
        e.preventDefault();
        addChip(options[highlightedIndex]);
      } else if (trimmed) {
        e.preventDefault();
        addChip(trimmed);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeChip(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <div
          className={cn(
            "flex flex-wrap gap-2 rounded-xl border border-input bg-background p-2 min-h-[42px]",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {value.map((chip) => (
            <Badge key={chip} variant="secondary" className="flex items-center gap-1 pr-1">
              {chip}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChip(chip);
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remove ${chip}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && options.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border bg-popover p-1 shadow-md max-h-48 overflow-auto">
            {visibleSuggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                type="button"
                // Select on mousedown + preventDefault so the input never blurs
                // before the click registers — keeps selection reliable.
                onMouseDown={(e) => {
                  e.preventDefault();
                  addChip(suggestion);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm rounded-lg outline-none",
                  i === highlightedIndex ? "bg-accent/10" : "hover:bg-accent/10"
                )}
              >
                {suggestion}
              </button>
            ))}
            {canAddCustom && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addChip(trimmed);
                }}
                onMouseEnter={() => setHighlightedIndex(visibleSuggestions.length)}
                className={cn(
                  "flex w-full items-center gap-1.5 text-left px-3 py-1.5 text-sm rounded-lg outline-none",
                  highlightedIndex === visibleSuggestions.length ? "bg-accent/10" : "hover:bg-accent/10"
                )}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>
                  Add <span className="font-medium">&ldquo;{trimmed}&rdquo;</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
