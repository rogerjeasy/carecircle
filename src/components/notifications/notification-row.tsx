"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dismiss, markRead } from "./store";
import { typeMeta } from "./data";
import { shortTime } from "./utils";
import type { NotificationItem } from "./types";

const SWIPE_THRESHOLD = 72;

/** A notification row: typed icon + actor avatar, summary, time, unread dot. Swipe-to-dismiss on
 *  touch, with a menu fallback (Mark read / Dismiss) on every size. */
export function NotificationRow({ item, onNavigate }: { item: NotificationItem; onNavigate?: () => void }) {
  const router = useRouter();
  const meta = typeMeta[item.type];
  const Icon = meta.icon;

  const [dx, setDx] = React.useState(0);
  const startX = React.useRef<number | null>(null);
  const swiping = React.useRef(false);

  const activate = () => {
    markRead(item.id);
    onNavigate?.();
    router.push(item.href);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    startX.current = e.clientX;
    swiping.current = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!swiping.current || startX.current === null) return;
    const d = e.clientX - startX.current;
    if (d < 0) setDx(Math.max(d, -120));
  };
  const onPointerUp = () => {
    if (!swiping.current) return;
    swiping.current = false;
    startX.current = null;
    if (dx <= -SWIPE_THRESHOLD) dismiss(item.id);
    else setDx(0);
  };

  return (
    <li className="relative overflow-hidden rounded-xl">
      {/* Revealed dismiss affordance behind the row */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 bg-destructive/10 pr-4 pl-8 text-xs font-medium text-destructive">
        <X className="h-4 w-4" aria-hidden="true" />
        Dismiss
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${dx}px)` }}
        className={cn(
          "relative flex items-start gap-3 rounded-xl border bg-card p-3",
          dx === 0 && "motion-safe:transition-transform",
          item.urgent && !item.read && "border-l-4 border-l-destructive",
          !item.read && !item.urgent && "bg-primary/5"
        )}
      >
        {/* Leading: type icon + actor avatar badge */}
        <span className="relative shrink-0">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", meta.tint)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          {item.actor && (
            <Avatar className="absolute -bottom-1 -right-1 h-5 w-5 ring-2 ring-card">
              <AvatarFallback className={cn("text-[8px] font-semibold", item.actor.color)}>
                {item.actor.initials}
              </AvatarFallback>
            </Avatar>
          )}
        </span>

        {/* Main tap target */}
        <button
          type="button"
          onClick={activate}
          className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <p className={cn("min-w-0 break-words text-sm leading-snug", !item.read && "font-medium")}>
            {item.urgent && <span className="text-destructive" aria-hidden="true">⚠ </span>}
            {item.summary}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {meta.label} · {shortTime(item.at)}
          </p>
        </button>

        {/* Unread dot */}
        {!item.read && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
        )}

        {/* Non-gesture fallback menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7 shrink-0" aria-label="Notification options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {!item.read && (
              <DropdownMenuItem onClick={() => markRead(item.id)}>
                <Check className="mr-2 h-4 w-4" />
                Mark read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => dismiss(item.id)}>
              <X className="mr-2 h-4 w-4" />
              Dismiss
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
