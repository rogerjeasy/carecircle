"use client";

import { useLocale, useTranslations } from "next-intl";
import { MessageSquarePlus, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "./types";

/** Locale-aware "2 hours ago" without pulling in date-fns locale bundles. */
function relativeTime(locale: string, iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now(); // negative = past
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffMs);
  const min = 60_000, hr = 60 * min, day = 24 * hr, week = 7 * day, month = 30 * day, year = 365 * day;
  if (abs < min) return rtf.format(Math.round(diffMs / 1000), "second");
  if (abs < hr) return rtf.format(Math.round(diffMs / min), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hr), "hour");
  if (abs < week) return rtf.format(Math.round(diffMs / day), "day");
  if (abs < month) return rtf.format(Math.round(diffMs / week), "week");
  if (abs < year) return rtf.format(Math.round(diffMs / month), "month");
  return rtf.format(Math.round(diffMs / year), "year");
}

export interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
}

/** The history rail: "New conversation" + a scrollable list of saved threads. */
export function ConversationList({ conversations, activeId, onSelect, onNew, onRename, onDelete }: ConversationListProps) {
  const t = useTranslations("ask");
  const locale = useLocale();
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button onClick={onNew} className="w-full justify-start gap-2">
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
        {t("list.new")}
      </Button>

      {conversations.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          {t("list.emptyHint")}
        </p>
      ) : (
        <nav aria-label={t("list.historyNav")} className="min-h-0 flex-1 space-y-1 overflow-y-auto pe-1">
          <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("list.recent")}
          </p>
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded-xl transition-colors",
                  active ? "bg-muted" : "hover:bg-muted/60"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? "true" : undefined}
                  className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl px-2.5 py-2 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                >
                  <MessageCircle
                    className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {relativeTime(locale, c.updatedAt)}
                    </span>
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("list.options", { title: c.title })}
                      className="me-1 h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-lg:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onRename(c)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      {t("list.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onDelete(c)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t("list.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}
