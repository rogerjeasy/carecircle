"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}

function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  /** The care recipient's real name (null = no profile yet). */
  recipientName: string | null;
}

/** The persistent bottom input — send + a mic option, safe-area aware. */
export function Composer({ value, onChange, onSubmit, disabled, recipientName }: ComposerProps) {
  const t = useTranslations("ask");
  const locale = useLocale();
  const [listening, setListening] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = createRecognition();
    if (!rec) {
      toast(t("composer.voiceUnsupported"));
      return;
    }
    recognitionRef.current = rec;
    rec.lang = locale;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript;
      if (transcript) onChange(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="shrink-0 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && value.trim()) onSubmit();
        }}
        className="mx-auto flex max-w-3xl items-center gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={recipientName ? t("composer.placeholderNamed", { name: recipientName }) : t("composer.placeholderGeneric")}
            aria-label={recipientName ? t("composer.ariaNamed", { name: recipientName }) : t("composer.ariaGeneric")}
            className="h-12 pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMic}
            aria-label={listening ? t("composer.stopVoice") : t("composer.startVoice")}
            aria-pressed={listening}
            className={cn(
              "absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2",
              listening && "bg-destructive/10 text-destructive"
            )}
          >
            <Mic className={cn("h-4 w-4", listening && "motion-safe:animate-pulse")} />
          </Button>
        </div>
        <Button type="submit" size="icon" className="h-12 w-12 shrink-0" disabled={disabled || !value.trim()} aria-label={t("composer.send")}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
