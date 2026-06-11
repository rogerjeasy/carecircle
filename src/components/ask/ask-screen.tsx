"use client";

import * as React from "react";
import { toast } from "sonner";
import { Lock, Sparkles, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Composer } from "./composer";
import { ConversationList } from "./conversation-list";
import { AssistantMessage, ThinkingBubble, UserBubble } from "./message";
import { useReducedMotion } from "./use-typewriter";
import { EXAMPLE_PROMPTS } from "./data";
import { askKintwadi, loadConversation, deleteConversation, renameConversation } from "@/lib/ask/actions";
import type { ConversationDetail, ConversationSummary, Message } from "./types";

export interface AskScreenProps {
  /** First name of the active circle's care recipient, for the copy. */
  recipientName: string | null;
  /** The user's saved conversations in this circle, newest first. */
  conversations: ConversationSummary[];
  /** The most recent conversation (restored on load), or null to start fresh. */
  initialConversation: ConversationDetail | null;
}

/** "Ask Kintwadi" — a calm chat over THIS circle's record, with saved, resumable conversations. */
export function AskScreen({ recipientName, conversations: initialList, initialConversation }: AskScreenProps) {
  const reduced = useReducedMotion();
  const [conversations, setConversations] = React.useState<ConversationSummary[]>(initialList);
  const [activeId, setActiveId] = React.useState<string | null>(initialConversation?.id ?? null);
  const [messages, setMessages] = React.useState<Message[]>(initialConversation?.messages ?? []);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [loadingConv, setLoadingConv] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<ConversationSummary | null>(null);
  const [pendingRename, setPendingRename] = React.useState<ConversationSummary | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const idRef = React.useRef(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the conversation grows.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, thinking, loadingConv, reduced]);

  const ask = React.useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || thinking) return;
      setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: "user", text: q }]);
      setInput("");
      setThinking(true);
      try {
        const res = await askKintwadi(q, activeId);
        if (res.ok) {
          setMessages((prev) => [
            ...prev,
            { id: `m-${idRef.current++}`, role: "assistant", text: res.answer, sources: res.sources },
          ]);
          setActiveId(res.conversationId);
          // Move/insert this conversation at the top of the list (keep an existing title).
          setConversations((prev) => {
            const existing = prev.find((c) => c.id === res.conversationId);
            const rest = prev.filter((c) => c.id !== res.conversationId);
            return [
              { id: res.conversationId, title: existing?.title ?? res.title, updatedAt: new Date().toISOString() },
              ...rest,
            ];
          });
        } else {
          toast.error(res.error);
          setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: "assistant", text: res.error }]);
        }
      } catch {
        toast.error("Couldn't reach the assistant. Please try again.");
      } finally {
        setThinking(false);
      }
    },
    [thinking, activeId]
  );

  const startNew = React.useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setSheetOpen(false);
  }, []);

  const selectConversation = React.useCallback(
    async (id: string) => {
      setSheetOpen(false);
      if (id === activeId) return;
      setLoadingConv(true);
      try {
        const res = await loadConversation(id);
        if (res.ok) {
          setMessages(res.data.messages);
          setActiveId(res.data.id);
        } else {
          toast.error(res.error);
        }
      } finally {
        setLoadingConv(false);
      }
    },
    [activeId]
  );

  const confirmDelete = React.useCallback(() => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    const prev = conversations;
    setConversations((p) => p.filter((c) => c.id !== target.id));
    if (target.id === activeId) startNew();
    void deleteConversation(target.id).then((res) => {
      if (!res.ok) {
        setConversations(prev);
        toast.error(res.error ?? "Couldn't delete the conversation");
      }
    });
  }, [pendingDelete, conversations, activeId, startNew]);

  const startRename = React.useCallback((c: ConversationSummary) => {
    setPendingRename(c);
    setRenameValue(c.title);
  }, []);

  const confirmRename = React.useCallback(() => {
    const target = pendingRename;
    const title = renameValue.trim();
    setPendingRename(null);
    if (!target || !title || title === target.title) return;
    const prev = conversations;
    setConversations((p) => p.map((c) => (c.id === target.id ? { ...c, title } : c)));
    void renameConversation(target.id, title).then((res) => {
      if (!res.ok) {
        setConversations(prev);
        toast.error(res.error ?? "Couldn't rename the conversation");
      }
    });
  }, [pendingRename, renameValue, conversations]);

  const newestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const hasConversation = messages.length > 0;
  const who = recipientName ?? "your circle";

  const list = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      onSelect={selectConversation}
      onNew={startNew}
      onRename={startRename}
      onDelete={setPendingDelete}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[30rem] gap-5 md:h-[calc(100dvh-7rem)]">
      {/* History rail (desktop / tablet landscape) */}
      <aside className="hidden w-72 shrink-0 flex-col border-e pe-4 lg:flex">{list}</aside>

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Scope bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 lg:hidden"
              onClick={() => setSheetOpen(true)}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              History
            </Button>
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              <span className="truncate">{recipientName ? `${recipientName}'s care only` : "This circle only"}</span>
            </Badge>
          </div>
          {hasConversation && (
            <Button variant="ghost" size="sm" onClick={startNew} className="text-muted-foreground">
              New
            </Button>
          )}
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {loadingConv ? (
            <ConversationSkeleton />
          ) : !hasConversation && !thinking ? (
            <EmptyState who={who} onPick={ask} />
          ) : (
            <div
              className="mx-auto w-full max-w-3xl space-y-5 py-2"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Conversation with Kintwadi"
            >
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} text={m.text} />
                ) : (
                  <AssistantMessage key={m.id} message={m} animate={!reduced && m.id === newestAssistantId} />
                )
              )}
              {thinking && <ThinkingBubble />}
            </div>
          )}
        </div>

        {/* Composer */}
        <Composer value={input} onChange={setInput} onSubmit={() => ask(input)} disabled={thinking} />
      </div>

      {/* History drawer (mobile / tablet portrait) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="flex w-[20rem] max-w-[85vw] flex-col p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1">{list}</div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from your history. It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename conversation */}
      <Dialog open={pendingRename !== null} onOpenChange={(o) => !o && setPendingRename(null)}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmRename();
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename conversation</DialogTitle>
              <DialogDescription>Give this conversation a name that&apos;s easy to find later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="conversation-title">Title</Label>
              <Input
                id="conversation-title"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={80}
                autoFocus
                placeholder="e.g. Cardiology questions"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPendingRename(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 py-2" aria-hidden="true">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-7/12" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading conversation…
      </div>
    </div>
  );
}

function EmptyState({ who, onPick }: { who: string; onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-5 px-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Ask about {who}&apos;s care</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ask in plain language. Answers come only from this circle&apos;s record, with sources you can check.
        </p>
      </div>
      <ul className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt} className="min-w-0">
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="rounded-full border bg-card px-3.5 py-2 text-sm text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
