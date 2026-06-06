"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { firstName } from "./utils";
import type { Member } from "./types";

/** The assignee's avatar, optionally captioned with their first name. Dashed when unassigned. */
export function MemberAvatar({
  member,
  withName = false,
  size = "sm",
  className,
}: {
  member?: Member;
  withName?: boolean;
  size?: "xs" | "sm";
  className?: string;
}) {
  const dim = size === "xs" ? "h-6 w-6" : "h-7 w-7";
  const text = size === "xs" ? "text-[10px]" : "text-xs";

  if (!member) {
    return (
      <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground",
            dim,
            text
          )}
          aria-hidden="true"
        >
          ?
        </span>
        {withName && <span className="truncate text-xs text-muted-foreground">Unassigned</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)} title={member.name}>
      <Avatar className={cn("shrink-0", dim)}>
        <AvatarFallback className={cn("font-semibold", text, member.color)}>{member.initials}</AvatarFallback>
      </Avatar>
      {withName && <span className="truncate text-xs text-muted-foreground">{firstName(member.name)}</span>}
    </div>
  );
}
