"use client";

import { Phone, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { firstName, memberById, timeRange } from "./utils";
import type { Shift } from "./types";

/** A colored block representing one person's shift: avatar, name, time range, in-person/on-call. */
export function ShiftBlock({
  shift,
  canManage,
  onDelete,
  highlight = false,
  className,
}: {
  shift: Shift;
  canManage: boolean;
  onDelete: () => void;
  highlight?: boolean;
  className?: string;
}) {
  const member = memberById(shift.memberId);
  if (!member) return null;
  const onCall = shift.type === "on-call";
  const TypeIcon = onCall ? Phone : User;

  return (
    <div
      className={cn(
        "group relative rounded-lg border px-2 py-1.5 transition-shadow",
        member.block,
        onCall && "border-dashed",
        highlight && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarFallback className={cn("text-[9px] font-semibold", member.color)}>
            {member.initials}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{firstName(member.name)}</span>
        <TypeIcon className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
      </div>
      <p className="mt-0.5 truncate text-[11px] tabular-nums opacity-80">{timeRange(shift)}</p>
      <span className="sr-only">{onCall ? "On call" : "In person"}</span>

      {canManage && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${firstName(member.name)}'s shift`}
          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:flex group-focus-within:flex"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
