"use client";

import * as React from "react";
import { toast } from "sonner";
import { addDays, format, isToday, isYesterday } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Settings2,
  Share2,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DigestCard } from "./digest-card";
import { DigestGenerating } from "./digest-skeleton";
import { ByTheNumbers } from "./by-the-numbers";
import { SourceChips } from "./source-chips";
import { useReducedMotion } from "./use-reduced-motion";
import { CARE_RECIPIENT, DIGEST_SETTINGS, digestForOffset } from "./data";

/** The Daily Digest: a warm, AI-written end-of-day summary with a date stepper. */
export function DigestScreen() {
  const reduced = useReducedMotion();
  const [now] = React.useState(() => new Date());
  const [offset, setOffset] = React.useState(0);
  // `generating` is derived: true until the day's digest has been "written" (readyOffset === offset).
  const [readyOffset, setReadyOffset] = React.useState<number | null>(null);
  const [speaking, setSpeaking] = React.useState(false);
  const [feedbackByOffset, setFeedbackByOffset] = React.useState<Record<number, "up" | "down">>({});

  const generating = readyOffset !== offset;
  const feedback = feedbackByOffset[offset] ?? null;
  const date = addDays(now, offset);
  const digest = digestForOffset(offset);
  const dateLabel = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "EEE, MMM d");

  const stopSpeech = React.useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // "Write" the digest on mount + whenever the day changes (the setState runs inside the timeout).
  React.useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    const t = setTimeout(() => setReadyOffset(offset), 950);
    return () => clearTimeout(t);
  }, [offset]);

  React.useEffect(() => () => stopSpeech(), [stopSpeech]);

  const toggleListen = () => {
    if (!digest) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast("Read-aloud isn't supported on this device");
      return;
    }
    if (speaking) {
      stopSpeech();
      return;
    }
    const utter = new SpeechSynthesisUtterance(`${digest.headline}. ${digest.paragraphs.join(" ")}`);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const giveFeedback = (value: "up" | "down") => {
    setFeedbackByOffset((prev) => {
      const next = { ...prev };
      if (next[offset] === value) delete next[offset];
      else next[offset] = value;
      return next;
    });
    if (feedback !== value) toast("Thanks — this helps tune future digests");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Daily digest</h1>
          <p className="mt-1 text-muted-foreground">A warm end-of-day update on {CARE_RECIPIENT.name}.</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4" />
              <span className="ml-1">Digest settings</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <p className="text-sm font-semibold">Who gets the digest</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sent to {DIGEST_SETTINGS.recipients.join(" and ")}.
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{DIGEST_SETTINGS.cadence}</span>
              <span className="text-muted-foreground">at {DIGEST_SETTINGS.time}</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Manage recipients and timing in Settings.</p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Date stepper */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setOffset((o) => o - 1)} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold">{dateLabel}</p>
            <p className="truncate text-xs text-muted-foreground">{format(date, "EEEE, MMMM d")}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Digest body — comfortable centered reading width */}
      <div className="mx-auto w-full max-w-2xl space-y-5">
        {generating ? (
          <DigestGenerating />
        ) : digest ? (
          <>
            <DigestCard key={offset} digest={digest} reduced={reduced} />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success("Shared with family")}>
                <Share2 className="h-4 w-4" />
                <span className="ml-1">Share with family</span>
              </Button>
              <Button variant="outline" size="sm" onClick={toggleListen} aria-pressed={speaking}>
                {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span className="ml-1">{speaking ? "Stop" : "Listen"}</span>
              </Button>
              <div className="ml-auto flex items-center gap-1">
                <span className="mr-1 text-xs text-muted-foreground">Helpful?</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", feedback === "up" && "bg-success/10 text-success")}
                  onClick={() => giveFeedback("up")}
                  aria-label="This digest was helpful"
                  aria-pressed={feedback === "up"}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", feedback === "down" && "bg-warning/10 text-warning")}
                  onClick={() => giveFeedback("down")}
                  aria-label="This digest missed the mark"
                  aria-pressed={feedback === "down"}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ByTheNumbers numbers={digest.numbers} />
            <SourceChips sources={digest.sources} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <Sparkles className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">No digest yet for this day</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Digests are written each evening once the day&apos;s care is logged.
        </p>
      </div>
    </div>
  );
}
