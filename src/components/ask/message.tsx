"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceCards } from "./source-card";
import { useTypewriter } from "./use-typewriter";
import type { Message } from "./types";

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground sm:max-w-[75%]">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}

export function AssistantMessage({ message, animate }: { message: Message; animate: boolean }) {
  const { shown, done } = useTypewriter(message.text, animate);
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="min-w-0 rounded-2xl rounded-tl-md border bg-card px-4 py-3">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {shown}
            {!done && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-primary/60 align-middle motion-reduce:hidden" aria-hidden="true" />}
          </p>
        </div>
        {done && message.sources && message.sources.length > 0 && (
          <div className="motion-safe:animate-in motion-safe:fade-in">
            <SourceCards sources={message.sources} />
          </div>
        )}
      </div>
    </div>
  );
}

/** A thinking indicator shown before the assistant's answer starts streaming. */
export function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border bg-card px-4 py-3.5" aria-label="Thinking">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 w-1.5 rounded-full bg-muted-foreground/50 motion-safe:animate-bounce")}
            style={{ animationDelay: `${i * 150}ms` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
