"use client";

import * as React from "react";
import { startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Button } from "@/components/ui/button";
import { FilterControls } from "./filter-controls";
import { Composer } from "./composer";
import { EventCard } from "./event-card";
import { EventSkeleton } from "./skeletons";
import { EmptyState } from "./empty-state";
import { useReducedMotion } from "./use-reduced-motion";
import { demoEvents } from "./data";
import { canSeePrivate, formatDayLabel, groupEventsByDay, withinRange, type DateRange } from "./utils";
import type { TimelineComment, TimelineEvent, Visibility } from "./types";

/** The Care Timeline: a chronological, filterable, role-aware activity feed for Antonio's care. */
export function TimelineScreen() {
  const { role } = useAppShell();
  const reducedMotion = useReducedMotion();

  const [events, setEvents] = React.useState<TimelineEvent[]>(demoEvents);
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange>("all");
  const [isLoading, setIsLoading] = React.useState(false);
  const [highlightedEventId, setHighlightedEventId] = React.useState<string | null>(null);
  const [highlightedDay, setHighlightedDay] = React.useState<string | null>(null);

  const [now] = React.useState(() => new Date());
  const dayRefs = React.useRef(new Map<string, HTMLElement>());

  const canViewPrivate = canSeePrivate(role);

  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => {
      // Role-based visibility — private events are hidden from caregivers & read-only.
      if (event.visibility === "private" && !canViewPrivate) return false;

      // Type filter
      if (activeFilter !== "all" && event.type !== activeFilter) return false;

      // Date range
      if (!withinRange(event.timestamp, dateRange, now)) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inSummary = event.summary.toLowerCase().includes(q);
        const inDetails = event.details?.toLowerCase().includes(q);
        const inAuthor = event.authorName.toLowerCase().includes(q);
        if (!inSummary && !inDetails && !inAuthor) return false;
      }

      return true;
    });
  }, [events, activeFilter, searchQuery, dateRange, canViewPrivate, now]);

  const groupedEvents = groupEventsByDay(filteredEvents);
  const sortedDays = Array.from(groupedEvents.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const hasActiveFilters = activeFilter !== "all" || !!searchQuery || dateRange !== "all";

  // Scroll the feed to the day nearest the chosen date (jump, not filter).
  const handleJumpToDate = (date: Date) => {
    if (sortedDays.length === 0) return;
    const target = startOfDay(date).getTime();
    let bestKey = sortedDays[0];
    let bestDiff = Infinity;
    for (const key of sortedDays) {
      const diff = Math.abs(new Date(key).getTime() - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestKey = key;
      }
    }
    const el = dayRefs.current.get(bestKey);
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      setHighlightedDay(bestKey);
      window.setTimeout(() => setHighlightedDay(null), 1600);
    }
  };

  const handlePost = (text: string, visibility: Visibility) => {
    const newEvent: TimelineEvent = {
      id: `new-${Date.now()}`,
      type: "note",
      summary: "Maria added a note",
      details: text,
      authorName: "Maria Rodriguez",
      authorInitials: "MR",
      authorColor: "bg-accent/10 text-accent",
      timestamp: new Date(),
      visibility,
      comments: [],
      reactions: [],
    };
    setEvents((prev) => [newEvent, ...prev]);
    setHighlightedEventId(newEvent.id);
    window.setTimeout(() => setHighlightedEventId(null), 2000);
  };

  const handleReact = (eventId: string) => {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;
        const hasReacted = event.reactions.some((r) => r.userId === "maria");
        return hasReacted
          ? { ...event, reactions: event.reactions.filter((r) => r.userId !== "maria") }
          : { ...event, reactions: [...event.reactions, { userId: "maria", type: "heart" }] };
      })
    );
  };

  const handleComment = (eventId: string, text: string) => {
    const newComment: TimelineComment = {
      id: `comment-${Date.now()}`,
      authorName: "Maria Rodriguez",
      authorInitials: "MR",
      authorColor: "bg-accent/10 text-accent",
      text,
      timestamp: new Date(),
    };
    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? { ...event, comments: [...event.comments, newComment] } : event))
    );
  };

  const handleLoadMore = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // In a real app, fetch the next page here.
    setIsLoading(false);
  };

  const filters = {
    activeFilter,
    onFilterChange: setActiveFilter,
    searchQuery,
    onSearchChange: setSearchQuery,
    dateRange,
    onDateRangeChange: setDateRange,
    onJumpToDate: handleJumpToDate,
  };

  return (
    <div className="lg:flex lg:justify-center lg:gap-8">
      {/* Desktop sticky filter / jump rail */}
      <aside className="hidden lg:block lg:w-60 lg:shrink-0">
        <div className="sticky top-20">
          <FilterControls orientation="rail" {...filters} />
        </div>
      </aside>

      {/* Feed column — a comfortable centered reading measure */}
      <div className="mx-auto w-full max-w-2xl lg:mx-0">
        {/* Phone / tablet sticky filter bar */}
        <div className="lg:hidden">
          <FilterControls orientation="bar" {...filters} />
        </div>

        <div className="py-6">
          <Composer role={role} onPost={handlePost} />

          {filteredEvents.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} />
          ) : (
            <div className="space-y-6" role="feed" aria-busy={isLoading} aria-label="Care timeline">
              {sortedDays.map((dayKey) => {
                const dayDate = new Date(dayKey);
                const dayEvents = groupedEvents.get(dayKey)!;

                return (
                  <div
                    key={dayKey}
                    ref={(el) => {
                      if (el) dayRefs.current.set(dayKey, el);
                      else dayRefs.current.delete(dayKey);
                    }}
                    className="scroll-mt-20"
                  >
                    {/* Day divider */}
                    <div className="sticky top-16 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                      <h3
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-sm font-semibold text-muted-foreground transition-colors",
                          highlightedDay === dayKey && "bg-primary/10 text-primary"
                        )}
                      >
                        {formatDayLabel(dayDate)}
                      </h3>
                    </div>

                    {/* Day's events */}
                    <div className="mt-3 space-y-3">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={event.id}
                          role="article"
                          className={cn(
                            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
                            highlightedEventId === event.id &&
                              "rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                          style={{ animationDelay: `${Math.min(idx, 6) * 50}ms` }}
                        >
                          <EventCard event={event} onReact={handleReact} onComment={handleComment} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Load more */}
              <div className="pt-2 text-center">
                <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Load earlier updates"}
                </Button>
              </div>

              {/* Loading skeletons */}
              {isLoading && (
                <div className="space-y-3" aria-hidden="true">
                  <EventSkeleton />
                  <EventSkeleton />
                  <EventSkeleton />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
