"use client";

import { BellOff } from "lucide-react";
import { NotificationRow } from "./notification-row";
import { groupNotifications } from "./utils";
import type { NotificationItem } from "./types";

function Group({ label, items, onNavigate }: { label: string; items: NotificationItem[]; onNavigate?: () => void }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={label} className="space-y-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      <ul className="space-y-2">
        {items.map((n) => (
          <NotificationRow key={n.id} item={n} onNavigate={onNavigate} />
        ))}
      </ul>
    </section>
  );
}

/** Grouped list (Needs attention / Today / Earlier). `compact` drops headings for the popover. */
export function NotificationList({
  items,
  onNavigate,
  compact = false,
}: {
  items: NotificationItem[];
  onNavigate?: () => void;
  compact?: boolean;
}) {
  if (items.length === 0) return <EmptyState />;

  const { pinned, today, earlier } = groupNotifications(items);

  if (compact) {
    const ordered = [...pinned, ...today, ...earlier];
    return (
      <ul className="space-y-2">
        {ordered.map((n) => (
          <NotificationRow key={n.id} item={n} onNavigate={onNavigate} />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <Group label="Needs attention" items={pinned} onNavigate={onNavigate} />
      <Group label="Today" items={today} onNavigate={onNavigate} />
      <Group label="Earlier" items={earlier} onNavigate={onNavigate} />
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <BellOff className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">You&apos;re all caught up 💚</p>
        <p className="mt-1 text-sm text-muted-foreground">No new notifications right now.</p>
      </div>
    </div>
  );
}
