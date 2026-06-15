"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { firstName } from "./utils";
import { useApptMembers } from "./members-context";
import type { Member } from "./types";

export interface AssignedMemberProps {
  member?: Member;
  /** Show the "Paolo is taking him" sentence next to the avatar. */
  withLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * The assigned member's avatar, optionally with a calm "{First} is taking {him}" caption. When no
 * one is assigned it renders a dashed placeholder + "Unassigned" so the gap is obvious but quiet.
 */
export function AssignedMember({ member, withLabel = true, size = "md", className }: AssignedMemberProps) {
  const t = useTranslations("appointments");
  const { recipientName } = useApptMembers();
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  if (!member) {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground",
            dim,
            text
          )}
          aria-hidden="true"
        >
          ?
        </div>
        {withLabel && <span className="truncate text-sm text-muted-foreground">{t("unassigned")}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Avatar className={cn("shrink-0", dim)}>
        <AvatarFallback className={cn("font-semibold", text, member.color)}>
          {member.initials}
        </AvatarFallback>
      </Avatar>
      {withLabel && (
        <span className="truncate text-sm text-muted-foreground">
          {t.rich("takingNamed", {
            name: firstName(member.name),
            recipient: recipientName ?? t("recipientFallback"),
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </span>
      )}
    </div>
  );
}
