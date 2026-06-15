"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Sparkles,
  Loader2,
  Users,
  User,
  Pill,
  FileText,
  ListTodo,
  Calendar,
  MessageSquare,
  Siren,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { globalSearch } from "@/lib/search/actions";
import type { SearchResult, SearchResultType } from "@/lib/search/types";

// Icon per result type; the group label comes from the `app.search.groups` message namespace.
const TYPE_ICON: Record<SearchResultType, typeof Users> = {
  person: Users,
  recipient: User,
  medication: Pill,
  document: FileText,
  task: ListTodo,
  appointment: Calendar,
  timeline: MessageSquare,
  incident: Siren,
};

// Order groups are shown in the dropdown.
const GROUP_ORDER: SearchResultType[] = [
  "person",
  "recipient",
  "medication",
  "document",
  "task",
  "appointment",
  "timeline",
  "incident",
];

const DEBOUNCE_MS = 220;
const MIN_LEN = 2;

interface GlobalSearchProps {
  className?: string;
  autoFocus?: boolean;
  /** Called after a result/handoff is chosen (e.g. close the mobile overlay). */
  onNavigate?: () => void;
}

/**
 * Top-bar command palette. Trigram keyword search over the circle's record (RLS-scoped server
 * action) plus a pinned "Ask Kintwadi" handoff to the RAG chat. Keyboard: ⌘/Ctrl-K focuses it,
 * ↑/↓ move, Enter selects, Esc closes.
 */
export function GlobalSearch({ className, autoFocus, onNavigate }: GlobalSearchProps) {
  const router = useRouter();
  const t = useTranslations("app.search");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const reqId = React.useRef(0);

  const trimmed = query.trim();
  const askHref = `/ask?q=${encodeURIComponent(trimmed)}`;

  // Flat, ordered list of selectable rows: the Ask handoff first, then grouped results.
  const grouped = GROUP_ORDER.map((type) => ({ type, items: results.filter((r) => r.type === type) })).filter(
    (g) => g.items.length > 0,
  );
  const flatResults = grouped.flatMap((g) => g.items);
  const hasAsk = trimmed.length >= MIN_LEN;
  const totalSelectable = (hasAsk ? 1 : 0) + flatResults.length;

  // Debounced fetch. Loading/clearing state is set in the onChange handler (an event) so this effect
  // only schedules the async request and applies it in the timer callback.
  React.useEffect(() => {
    if (trimmed.length < MIN_LEN) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const res = await globalSearch(trimmed);
      if (id !== reqId.current) return; // a newer request superseded this one
      setResults(res.results);
      setActiveIndex(0);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (value.trim().length < MIN_LEN) {
      reqId.current += 1; // cancel any in-flight result from applying
      setResults([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  };

  // ⌘/Ctrl-K focuses the search from anywhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    onNavigate?.();
    router.push(href);
  };

  const select = (index: number) => {
    if (hasAsk && index === 0) return go(askHref);
    const result = flatResults[index - (hasAsk ? 1 : 0)];
    if (result) go(result.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(totalSelectable - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (totalSelectable === 0) return;
      e.preventDefault();
      select(activeIndex);
    }
  };

  const showPanel = open && trimmed.length >= MIN_LEN;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        className="w-full pl-9 pr-8"
      />
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[min(28rem,90vw)] overflow-y-auto overflow-x-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          {/* Ask Kintwadi handoff — always first when there's a query. */}
          {hasAsk && (
            <Row
              active={activeIndex === 0}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => select(0)}
              icon={<Sparkles className="h-4 w-4 text-primary" />}
              title={
                <span className="truncate">
                  {t("askPrefix")} <span className="text-muted-foreground">“{trimmed}”</span>
                </span>
              }
              hint={t("askHint")}
              enterHint
            />
          )}

          {grouped.map((group) => {
            const Icon = TYPE_ICON[group.type];
            return (
              <div key={group.type} className="mt-1.5 first:mt-0">
                <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`groups.${group.type}` as "groups.person")}
                </p>
                {group.items.map((item) => {
                  const flatIndex = flatResults.indexOf(item) + (hasAsk ? 1 : 0);
                  return (
                    <Row
                      key={`${item.type}-${item.id}`}
                      active={activeIndex === flatIndex}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      onClick={() => select(flatIndex)}
                      icon={<Icon className="h-4 w-4 text-muted-foreground" />}
                      title={<span className="truncate">{item.title}</span>}
                      hint={item.subtitle}
                    />
                  );
                })}
              </div>
            );
          })}

          {!loading && flatResults.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches in this circle. Try Ask Kintwadi above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  active,
  onClick,
  onMouseEnter,
  icon,
  title,
  hint,
  enterHint,
}: {
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  icon: React.ReactNode;
  title: React.ReactNode;
  hint?: string;
  enterHint?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary/60">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="min-w-0 truncate font-medium">{title}</span>
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      {enterHint && active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </button>
  );
}
