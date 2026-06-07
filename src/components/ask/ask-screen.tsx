"use client";

import * as React from "react";
import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Composer } from "./composer";
import { AssistantMessage, ThinkingBubble, UserBubble } from "./message";
import { useReducedMotion } from "./use-typewriter";
import { CARE_RECIPIENT, EXAMPLE_PROMPTS, findAnswer } from "./data";
import type { Message } from "./types";

/** "Ask CareCircle" — a calm chat over THIS circle's record, with grounded, cited answers. */
export function AskScreen() {
  const reduced = useReducedMotion();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const idRef = React.useRef(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Keep the latest message in view as the conversation grows.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, thinking, reduced]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    const userMsg: Message = { id: `m-${idRef.current++}`, role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    timerRef.current = setTimeout(() => {
      const { answer, sources } = findAnswer(q);
      setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: "assistant", text: answer, sources }]);
      setThinking(false);
    }, 750);
  };

  const newestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const hasConversation = messages.length > 0;

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[28rem] flex-col md:h-[calc(100dvh-7rem)]">
      {/* Scope bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 pb-3">
        <Badge variant="secondary" className="gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          {CARE_RECIPIENT.name}&apos;s care only
        </Badge>
        {hasConversation && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="text-muted-foreground">
            Clear
          </Button>
        )}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {!hasConversation && !thinking ? (
          <EmptyState onPick={ask} />
        ) : (
          <div
            className="mx-auto w-full max-w-3xl space-y-5 py-2"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation with CareCircle"
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
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-5 px-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Ask about Antonio&apos;s care</h2>
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
