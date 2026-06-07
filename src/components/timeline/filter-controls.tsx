"use client";

import * as React from "react";
import { Search, Filter, ChevronDown, CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { dateRanges, filterChips } from "./data";
import type { DateRange } from "./utils";

export interface FilterControlsProps {
  orientation: "bar" | "rail";
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onJumpToDate: (date: Date) => void;
}

function Chip({
  id,
  label,
  active,
  onClick,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      key={id}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}

function JumpToDate({ onJump, className }: { onJump: (d: Date) => void; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
          <CalendarDays className="h-4 w-4" />
          <span>Jump to date</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          onSelect={(d) => {
            if (d) {
              onJump(d);
              setOpen(false);
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function RangeSelect({
  value,
  onChange,
  className,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
      <SelectTrigger className={cn("h-9 gap-1.5", className)} aria-label="Date range">
        <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {dateRanges.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Filter controls — a sticky contained bar on phone/tablet, a sticky rail on desktop. */
export function FilterControls(props: FilterControlsProps) {
  return props.orientation === "rail" ? <Rail {...props} /> : <Bar {...props} />;
}

/* ------------------------------- Top bar -------------------------------- */
function Bar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onJumpToDate,
}: FilterControlsProps) {
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter chips — desktop/tablet */}
        <div className="hidden flex-wrap gap-1.5 sm:flex">
          {filterChips.map((chip) => (
            <Chip
              key={chip.id}
              id={chip.id}
              label={chip.label}
              active={activeFilter === chip.id}
              onClick={() => onFilterChange(chip.id)}
            />
          ))}
        </div>

        {/* Mobile filter toggle */}
        <Button variant="outline" size="sm" className="sm:hidden" onClick={() => setShowMobileFilters((s) => !s)}>
          <Filter className="mr-1.5 h-4 w-4" />
          {filterChips.find((c) => c.id === activeFilter)?.label}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>

        <RangeSelect value={dateRange} onChange={onDateRangeChange} className="w-auto" />
        <JumpToDate onJump={onJumpToDate} />

        {/* Search */}
        <div className="relative ml-auto min-w-[140px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8"
            aria-label="Search updates"
          />
        </div>
      </div>

      {/* Mobile chip row */}
      {showMobileFilters && (
        <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
          {filterChips.map((chip) => (
            <Chip
              key={chip.id}
              id={chip.id}
              label={chip.label}
              active={activeFilter === chip.id}
              onClick={() => {
                onFilterChange(chip.id);
                setShowMobileFilters(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Rail ---------------------------------- */
function Rail({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onJumpToDate,
}: FilterControlsProps) {
  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search updates..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-8"
          aria-label="Search updates"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filter</p>
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((chip) => (
            <Chip
              key={chip.id}
              id={chip.id}
              label={chip.label}
              active={activeFilter === chip.id}
              onClick={() => onFilterChange(chip.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date range</p>
        <RangeSelect value={dateRange} onChange={onDateRangeChange} className="w-full" />
      </div>

      <JumpToDate onJump={onJumpToDate} className="w-full justify-start" />
    </div>
  );
}
