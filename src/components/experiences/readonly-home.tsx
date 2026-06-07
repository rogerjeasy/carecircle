"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, FileText, Heart, HeartPulse, Pill, Smile, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FEED, RECIPIENT, type FeedEvent } from "./data";

const kindIcon = { med: Pill, vital: HeartPulse, note: FileText, appointment: Calendar } as const;

/** Read-only relative experience — reassurance first, then a view-only timeline (react, don't edit). */
export function ReadonlyHome() {
  const [feed, setFeed] = React.useState<FeedEvent[]>(FEED);

  const react = (id: string) =>
    setFeed((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, reacted: !e.reacted, hearts: e.hearts + (e.reacted ? -1 : 1) } : e
      )
    );

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">How {RECIPIENT.name} is doing</h1>
        <p className="mt-1 text-muted-foreground">A gentle window into his day. You can react, but nothing here needs doing.</p>
      </div>

      {/* Two-up: reassurance summary + digest */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="space-y-3 p-5 sm:p-6">
            <Badge variant="success" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Calm day
            </Badge>
            <p className="text-lg font-semibold">{RECIPIENT.name} is having a good day 💚</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { icon: Pill, label: "Meds", value: "2/5 done" },
                { icon: Smile, label: "Mood", value: "Good" },
                { icon: HeartPulse, label: "BP", value: "128/82" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-card p-2.5 text-center">
                  <s.icon className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-1 text-sm font-semibold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col gap-2 p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Today&apos;s digest
            </p>
            <p className="text-pretty leading-relaxed text-foreground/90">
              It was a calm, steady day. {RECIPIENT.name}&apos;s morning medications went down without any fuss and he
              enjoyed a gentle walk in the garden. Nothing to worry about.
            </p>
            <Link
              href="/digest"
              className="mt-auto inline-flex w-fit items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Read the full digest
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Read-only timeline */}
      <section aria-label="Recent updates" className="mx-auto w-full max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Recent updates</h2>
          <Badge variant="secondary">View only</Badge>
        </div>
        <ul className="space-y-3">
          {feed.map((e) => {
            const Icon = kindIcon[e.kind];
            return (
              <li key={e.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{e.summary}</p>
                        {e.detail && <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className={cn("text-[9px] font-semibold", e.author.color)}>
                              {e.author.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span>{e.author.name}</span>
                          <span>·</span>
                          <span>{e.time}</span>
                          <button
                            type="button"
                            onClick={() => react(e.id)}
                            aria-pressed={e.reacted}
                            aria-label={e.reacted ? "Remove your heart" : "React with a heart"}
                            className={cn(
                              "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              e.reacted ? "bg-destructive/10 text-destructive" : "hover:bg-muted"
                            )}
                          >
                            <Heart className={cn("h-3.5 w-3.5", e.reacted && "fill-current")} aria-hidden="true" />
                            {e.hearts > 0 && <span className="tabular-nums">{e.hearts}</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
