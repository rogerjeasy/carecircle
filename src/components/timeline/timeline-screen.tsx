"use client";

import * as React from "react";
import { startOfDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Button } from "@/components/ui/button";
import { FilterControls } from "./filter-controls";
import { Composer } from "./composer";
import { EventCard } from "./event-card";
import { EventSkeleton } from "./skeletons";
import { EmptyState } from "./empty-state";
import { useReducedMotion } from "./use-reduced-motion";
import { postNote, addComment, toggleReaction, loadMoreTimeline } from "@/lib/timeline/actions";
import {
  authorColorFor,
  canContribute,
  canSeePrivate,
  formatDayLabel,
  groupEventsByDay,
  initialsFrom,
  withinRange,
  type DateRange,
} from "./utils";
import type { TimelineComment, TimelineData, TimelineEvent, Visibility } from "./types";

export interface TimelineScreenProps {
  /** Real feed loaded server-side for the active circle, or null when there's no circle/data. */
  initial: TimelineData | null;
}

/** The Care Timeline: a chronological, filterable, role-aware activity feed backed by the server. */
export function TimelineScreen({ initial }: TimelineScreenProps) {
  const { role, user } = useAppShell();
  const reducedMotion = useReducedMotion();

  const currentUserId = user?.id ?? "me";
  const currentUserName = user?.name?.trim() || "You";
  const currentUserInitials = user?.initials ?? initialsFrom(currentUserName);
  const currentUserColor = authorColorFor(currentUserId);
  const contributor = canContribute(role);

  const [events, setEvents] = React.useState<TimelineEvent[]>(initial?.events ?? []);
  const [hasMore, setHasMore] = React.useState(initial?.hasMore ?? false);
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
      if (event.visibility === "private" && !canViewPrivate) return false;
      if (activeFilter !== "all" && event.type !== activeFilter) return false;
      if (!withinRange(event.timestamp, dateRange, now)) return false;
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

  const handlePost = async (text: string, visibility: Visibility) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: TimelineEvent = {
      id: tempId,
      type: "note",
      summary: `${currentUserName.split(/\s+/)[0]} added a note`,
      details: text,
      authorName: currentUserName,
      authorInitials: currentUserInitials,
      authorColor: currentUserColor,
      timestamp: new Date(),
      visibility,
      comments: [],
      reactions: [],
    };
    setEvents((prev) => [optimistic, ...prev]);
    setHighlightedEventId(tempId);
    window.setTimeout(() => setHighlightedEventId(null), 2000);

    const fd = new FormData();
    fd.set("text", text);
    fd.set("visibility", visibility);
    const res = await postNote(fd);
    if (res.ok) {
      setEvents((prev) => prev.map((e) => (e.id === tempId ? res.data : e)));
      setHighlightedEventId(res.data.id);
      window.setTimeout(() => setHighlightedEventId(null), 2000);
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== tempId));
      toast.error(res.error ?? "Couldn't post your note");
    }
  };

  const handleReact = async (eventId: string) => {
    const snapshot = events;
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;
        const hasReacted = event.reactions.some((r) => r.userId === currentUserId);
        return hasReacted
          ? { ...event, reactions: event.reactions.filter((r) => r.userId !== currentUserId) }
          : { ...event, reactions: [...event.reactions, { userId: currentUserId, type: "heart" }] };
      })
    );
    // Optimistic-only for not-yet-persisted events (e.g. a note still saving).
    if (eventId.startsWith("temp-")) return;
    const res = await toggleReaction(eventId);
    if (!res.ok) {
      setEvents(snapshot);
      toast.error(res.error ?? "Couldn't update your reaction");
    }
  };

  const handleComment = async (eventId: string, text: string) => {
    if (eventId.startsWith("temp-")) {
      toast.error("Please wait for the post to finish saving");
      return;
    }
    const tempId = `temp-c-${Date.now()}`;
    const optimistic: TimelineComment = {
      id: tempId,
      authorName: currentUserName,
      authorInitials: currentUserInitials,
      authorColor: currentUserColor,
      text,
      timestamp: new Date(),
    };
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, comments: [...e.comments, optimistic] } : e))
    );

    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("text", text);
    const res = await addComment(fd);
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        if (res.ok) {
          return { ...e, comments: e.comments.map((c) => (c.id === tempId ? res.data : c)) };
        }
        return { ...e, comments: e.comments.filter((c) => c.id !== tempId) };
      })
    );
    if (!res.ok) toast.error(res.error ?? "Couldn't add your comment");
  };

  const handleLoadMore = async () => {
    if (events.length === 0) return;
    setIsLoading(true);
    const oldest = new Date(Math.min(...events.map((e) => e.timestamp.getTime())));
    const res = await loadMoreTimeline(oldest.toISOString());
    if (res.ok) {
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...res.events.filter((e) => !seen.has(e.id))];
      });
      setHasMore(res.hasMore);
    } else {
      toast.error(res.error ?? "Couldn't load earlier updates");
    }
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
          {contributor && (
            <Composer
              role={role}
              recipientName={initial?.recipientName ?? null}
              authorInitials={currentUserInitials}
              authorColor={currentUserColor}
              onPost={handlePost}
            />
          )}

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
                          <EventCard
                            event={event}
                            currentUserId={currentUserId}
                            currentUserInitials={currentUserInitials}
                            currentUserColor={currentUserColor}
                            canContribute={contributor}
                            onReact={handleReact}
                            onComment={handleComment}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <div className="pt-2 text-center">
                  <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
                    {isLoading ? "Loading..." : "Load earlier updates"}
                  </Button>
                </div>
              )}

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
