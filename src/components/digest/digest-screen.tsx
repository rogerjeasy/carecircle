"use client";

import * as React from "react";
import { toast } from "sonner";
import { addDays, format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Languages,
  RefreshCw,
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
import { DIGEST_SETTINGS } from "./data";
import { loadDigest, generateDigest, rateDigest, translateDigest } from "@/lib/digest/actions";
import { languageFor, ENGLISH_CODE } from "@/lib/digest/languages";
import type { DigestNarrativeTranslation } from "@/lib/digest/translate";
import type { Digest, Feedback } from "./types";

export interface DigestScreenProps {
  recipientName: string | null;
  /** Server's "today" as yyyy-MM-dd, the anchor for the date stepper. */
  today: string;
  /** Today's saved digest (or null) + the caller's feedback, to avoid a load flash. */
  initialDigest: Digest | null;
  initialFeedback: Feedback;
  /** Whether this member may generate/re-generate (non read-only). */
  canGenerate: boolean;
  /** The viewer's digest language ('en' = no translation). Drives the diaspora auto-translate. */
  viewerLanguage?: string;
}

interface DayState {
  digest: Digest | null;
  feedback: Feedback;
}

/** The Daily Digest: a warm, AI-written end-of-day summary built from the day's real care record. */
export function DigestScreen({
  recipientName,
  today,
  initialDigest,
  initialFeedback,
  canGenerate,
  viewerLanguage = ENGLISH_CODE,
}: DigestScreenProps) {
  const reduced = useReducedMotion();
  const [offset, setOffset] = React.useState(0);
  const [byDate, setByDate] = React.useState<Record<string, DayState>>({
    [today]: { digest: initialDigest, feedback: initialFeedback },
  });
  const [generating, setGenerating] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);

  // ---- Diaspora translation: when the viewer reads in another language, fetch (cached on the
  // server) and show the translated narrative by default, with a one-tap original toggle.
  const langMeta = viewerLanguage !== ENGLISH_CODE ? languageFor(viewerLanguage) : null;
  const [translationsById, setTranslationsById] = React.useState<Record<string, DigestNarrativeTranslation | null>>({});
  const [showOriginal, setShowOriginal] = React.useState(false);

  const date = addDays(parseISO(`${today}T00:00:00`), offset);
  const dateStr = format(date, "yyyy-MM-dd");
  const dateLabel = offset === 0 ? "Today" : offset === -1 ? "Yesterday" : format(date, "EEE, MMM d");

  const current = byDate[dateStr];
  const digest = current?.digest ?? null;
  const feedback = current?.feedback ?? null;
  // A day not yet in the cache is still loading (the effect below fetches it).
  const loading = current === undefined;

  const stopSpeech = React.useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Fetch a day's saved digest the first time it's viewed (when it isn't in the cache yet).
  React.useEffect(() => {
    // Stop any read-aloud when the day changes (cancel directly — no state write inside the effect).
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (current !== undefined) return;
    let cancelled = false;
    void loadDigest(dateStr).then((res) => {
      if (cancelled) return;
      if (res.ok) setByDate((prev) => ({ ...prev, [dateStr]: { digest: res.digest, feedback: res.feedback } }));
      else {
        toast.error(res.error);
        // Mark as resolved-empty so we stop showing the loading state.
        setByDate((prev) => ({ ...prev, [dateStr]: { digest: null, feedback: null } }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dateStr, current]);

  React.useEffect(() => () => stopSpeech(), [stopSpeech]);

  // Fetch the translation for the visible digest (no-op for English readers; server caches per
  // language per day, so repeats are instant). `null` marks a failed attempt so we don't loop.
  const digestId = digest?.id ?? null;
  React.useEffect(() => {
    if (!langMeta || !digestId || translationsById[digestId] !== undefined) return;
    let cancelled = false;
    void translateDigest(digestId, viewerLanguage).then((res) => {
      if (cancelled) return;
      setTranslationsById((prev) => ({ ...prev, [digestId]: res.ok ? res.translation : null }));
    });
    return () => {
      cancelled = true;
    };
  }, [digestId, langMeta, viewerLanguage, translationsById]);

  const translation = langMeta && digest ? (translationsById[digest.id] ?? null) : null;
  // What the card + read-aloud actually show: the translation (unless toggled back) or the original.
  const displayDigest: Digest | null =
    digest && translation && !showOriginal
      ? { ...digest, headline: translation.headline, paragraphs: translation.paragraphs }
      : digest;

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await generateDigest(dateStr);
      if (res.ok) {
        setByDate((prev) => ({ ...prev, [dateStr]: { digest: res.digest, feedback: null } }));
        toast.success("Digest ready");
      } else {
        toast.error(res.error);
      }
    } finally {
      setGenerating(false);
    }
  };

  const toggleListen = () => {
    if (!displayDigest) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast("Read-aloud isn't supported on this device");
      return;
    }
    if (speaking) {
      stopSpeech();
      return;
    }
    const utter = new SpeechSynthesisUtterance(`${displayDigest.headline}. ${displayDigest.paragraphs.join(" ")}`);
    // Reading the translated text? Hint the speech engine at the right voice.
    if (translation && !showOriginal) utter.lang = viewerLanguage;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const giveFeedback = (value: "up" | "down") => {
    if (!digest) return;
    const next: Feedback = feedback === value ? null : value;
    setByDate((prev) => ({ ...prev, [dateStr]: { digest, feedback: next } }));
    if (next) toast("Thanks — this helps tune future digests");
    void rateDigest(digest.id, next).then((res) => {
      if (!res.ok) {
        setByDate((prev) => ({ ...prev, [dateStr]: { digest, feedback } })); // revert
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Daily digest</h1>
          <p className="mt-1 text-muted-foreground">
            A warm end-of-day update{recipientName ? ` on ${recipientName}` : ""}.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4" />
              <span className="ml-1">Digest settings</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <p className="text-sm font-semibold">When the digest is written</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{DIGEST_SETTINGS.cadence}</span>
              <span className="text-muted-foreground">at {DIGEST_SETTINGS.time}</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Digests summarise the day&apos;s real care record. Manage recipients and timing in Settings.
            </p>
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
        {loading || generating ? (
          <DigestGenerating />
        ) : digest && displayDigest ? (
          <>
            {/* Language banner — the diaspora moment: same day, the reader's own language. */}
            {langMeta && translation && (
              <div className="flex items-center justify-between gap-2 rounded-xl border bg-primary/5 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <Languages className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">
                    {showOriginal ? "Showing the original (English)" : `Translated to ${langMeta.nativeLabel} for you`}
                  </span>
                </span>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setShowOriginal((v) => !v)}>
                  {showOriginal ? `Read in ${langMeta.nativeLabel}` : "Show original"}
                </Button>
              </div>
            )}

            <DigestCard key={`${dateStr}-${showOriginal || !translation ? "en" : viewerLanguage}`} digest={displayDigest} reduced={reduced} />

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
              {canGenerate && (
                <Button variant="ghost" size="sm" onClick={handleGenerate} className="text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  <span className="ml-1">Regenerate</span>
                </Button>
              )}
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

            <ByTheNumbers stats={digest.stats} />
            <SourceChips sources={digest.sources} />
          </>
        ) : (
          <EmptyState canGenerate={canGenerate} onGenerate={handleGenerate} label={dateLabel} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ canGenerate, onGenerate, label }: { canGenerate: boolean; onGenerate: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <Sparkles className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">No digest yet for {label.toLowerCase()}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {canGenerate
            ? "Write a warm summary from the day's logged care — meds, vitals, notes and more."
            : "Digests are written each evening once the day's care is logged."}
        </p>
      </div>
      {canGenerate && (
        <Button onClick={onGenerate}>
          <Sparkles className="h-4 w-4" />
          <span className="ml-1">Generate digest</span>
        </Button>
      )}
    </div>
  );
}
