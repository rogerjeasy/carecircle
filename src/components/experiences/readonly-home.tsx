"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Calendar, FileText, Heart, HeartPulse, Pill, Smile, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardData } from "@/components/dashboard/types";

const kindIcon: Record<string, typeof Pill> = {
  med: Pill,
  vital: HeartPulse,
  note: FileText,
  appointment: Calendar,
};

interface FeedItem {
  id: string;
  kind: string;
  summary: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  time: string;
  hearts: number;
  reacted: boolean;
}

// Reassurance stat tiles: stable keys, labels resolved via t(`readonly.stat.${key}`).
const STAT_META: { key: "meds" | "mood" | "bp"; icon: typeof Pill }[] = [
  { key: "meds", icon: Pill },
  { key: "mood", icon: Smile },
  { key: "bp", icon: HeartPulse },
];

/** Read-only relative experience — reassurance first, then a view-only timeline (react, don't edit). */
export function ReadonlyHome({ data }: { data: DashboardData | null }) {
  const t = useTranslations("experiences");
  const recipientName = data?.recipient?.firstName ?? t("readonly.fallbackRecipient");
  const stats = data?.stats;
  const digestParagraph = data?.digest?.paragraph;

  const [feed, setFeed] = React.useState<FeedItem[]>(() =>
    (data?.recentUpdates ?? []).map((e) => ({
      id: e.id,
      kind: e.type,
      summary: e.text,
      authorName: e.authorName,
      authorInitials: e.authorInitials,
      authorColor: e.authorColor,
      time: e.timeLabel,
      hearts: e.hearts,
      reacted: false,
    })),
  );

  const react = (id: string) =>
    setFeed((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, reacted: !e.reacted, hearts: e.hearts + (e.reacted ? -1 : 1) } : e
      )
    );

  const statValue: Record<"meds" | "mood" | "bp", string> = {
    meds:
      stats && stats.medsTotalToday > 0
        ? t("readonly.medsDone", { given: stats.medsGivenToday, total: stats.medsTotalToday })
        : "—",
    mood: stats?.moodLabel ?? "—",
    bp: stats?.latestVital?.value ?? "—",
  };

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("readonly.heading", { name: recipientName })}</h1>
        <p className="mt-1 text-muted-foreground">{t("readonly.subtitle")}</p>
      </div>

      {/* Two-up: reassurance summary + digest */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="space-y-3 p-5 sm:p-6">
            <Badge variant="success" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {t("readonly.calmDay")}
            </Badge>
            <p className="text-lg font-semibold">{t("readonly.goodDay", { name: recipientName })}</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {STAT_META.map((s) => {
                const label = t(`readonly.stat.${s.key}` as "readonly.stat.meds");
                return (
                  <div key={s.key} className="rounded-xl bg-card p-2.5 text-center">
                    <s.icon className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-1 text-sm font-semibold tabular-nums">{statValue[s.key]}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col gap-2 p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("readonly.digestLabel")}
            </p>
            <p className="text-pretty leading-relaxed text-foreground/90">
              {digestParagraph || t("readonly.noDigest", { name: recipientName })}
            </p>
            <Link
              href="/digest"
              className="mt-auto inline-flex w-fit items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("readonly.readFullDigest")}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Read-only timeline */}
      <section aria-label={t("readonly.recentAria")} className="mx-auto w-full max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("readonly.recentTitle")}</h2>
          <Badge variant="secondary">{t("readonly.viewOnly")}</Badge>
        </div>
        {feed.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">{t("readonly.noUpdates")}</CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {feed.map((e) => {
              const Icon = kindIcon[e.kind] ?? FileText;
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
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className={cn("text-[9px] font-semibold", e.authorColor)}>
                                {e.authorInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span>{e.authorName}</span>
                            <span>·</span>
                            <span>{e.time}</span>
                            <button
                              type="button"
                              onClick={() => react(e.id)}
                              aria-pressed={e.reacted}
                              aria-label={e.reacted ? t("readonly.removeHeart") : t("readonly.reactHeart")}
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
        )}
      </section>
    </div>
  );
}
