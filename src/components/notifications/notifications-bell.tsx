"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationList } from "./notification-list";
import { markAllRead, useHydrated, useNotifications } from "./store";
import { useIsPhone } from "./use-is-phone";
import { unreadCount } from "./utils";

/** The top-bar bell + its compact, scrollable notifications panel (Popover tablet+, Sheet phone). */
export function NotificationsBell() {
  const items = useNotifications();
  const hydrated = useHydrated();
  const isPhone = useIsPhone();
  const [open, setOpen] = React.useState(false);
  const count = hydrated ? unreadCount(items) : 0;

  const trigger = (
    <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${count} unread`}>
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <Badge variant="destructive" className="absolute -right-0.5 -top-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
          {count}
        </Badge>
      )}
    </Button>
  );

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
      <p className="font-semibold">Notifications</p>
      {count > 0 && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAllRead}>
          <CheckCheck className="h-3.5 w-3.5" />
          <span className="ml-1">Mark all read</span>
        </Button>
      )}
    </div>
  );

  const footer = (
    <div className="shrink-0 border-t p-2">
      <Button asChild variant="ghost" className="w-full justify-center" onClick={() => setOpen(false)}>
        <Link href="/notifications">See all</Link>
      </Button>
    </div>
  );

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <NotificationList items={items} compact onNavigate={() => setOpen(false)} />
    </div>
  );

  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="flex w-[88vw] max-w-sm flex-col gap-0 p-0">
          <SheetTitle className="sr-only">Notifications</SheetTitle>
          {header}
          {body}
          {footer}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className={cn("flex max-h-[70vh] w-[360px] flex-col p-0")}>
        {header}
        {body}
        {footer}
      </PopoverContent>
    </Popover>
  );
}
