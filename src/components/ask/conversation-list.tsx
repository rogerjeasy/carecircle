"use client";

import { formatDistanceToNow } from "date-fns";
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
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button onClick={onNew} className="w-full justify-start gap-2">
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
        Start a new conversation
      </Button>

      {conversations.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Your past conversations will appear here.
        </p>
      ) : (
        <nav aria-label="Conversation history" className="min-h-0 flex-1 space-y-1 overflow-y-auto pe-1">
          <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent
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
                      {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                    </span>
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Options for "${c.title}"`}
                      className="me-1 h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-lg:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onRename(c)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onDelete(c)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
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
