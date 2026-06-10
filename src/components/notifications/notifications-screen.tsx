"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationList } from "./notification-list";
import { NotificationsSkeleton } from "./notification-skeletons";
import { markAllRead, useHydrated, useLoadNotifications, useNotifications } from "./store";
import { FILTERS } from "./data";
import { matchesFilter, unreadCount } from "./utils";
import type { NotificationFilter } from "./types";

/** The full-page Notifications center. */
export function NotificationsScreen() {
  useLoadNotifications();
  const items = useNotifications();
  const hydrated = useHydrated();
  const [filter, setFilter] = React.useState<NotificationFilter>("all");

  const filtered = items.filter((n) => matchesFilter(n, filter));
  const unread = unreadCount(items);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            {hydrated && unread > 0 ? `${unread} unread` : "Stay on top of what's happening."}
          </p>
        </div>
        {hydrated && unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="self-start sm:self-auto">
            <CheckCheck className="h-4 w-4" />
            <span className="ml-1">Mark all read</span>
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
        <TabsList className="w-full">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="flex-1">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* List */}
      {!hydrated ? (
        <NotificationsSkeleton />
      ) : (
        <NotificationList items={filtered} />
      )}
    </div>
  );
}
