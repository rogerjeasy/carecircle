"use client";

import * as React from "react";
import { TrendingDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DayStatus, WeekDay } from "./types";

export function StatusDot({ status }: { status: DayStatus }) {
  const colors: Record<DayStatus, string> = {
    good: "bg-success",
    okay: "bg-warning",
    attention: "bg-destructive",
    unknown: "bg-muted-foreground/30 ring-2 ring-muted-foreground/50",
  };

  return (
    <span
      className={`h-2.5 w-2.5 rounded-full ${colors[status]} transition-colors`}
      aria-hidden="true"
    />
  );
}

export function WeekAtGlance({ days }: { days: WeekDay[] }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1" title={`${d.day}: ${d.label}`}>
          <StatusDot status={d.status} />
          <span className="text-[10px] text-muted-foreground hidden sm:block">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({ value, max, size = 40 }: { value: number; max: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">
          {value}/{max}
        </span>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  delay = 0,
  children,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "stable";
  delay?: number;
  children?: React.ReactNode;
}) {
  return (
    <Card
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      {/* sm:p-4 needed: CardContent's base class sets sm:pt-0 (assumes a CardHeader). */}
      <CardContent className="p-4 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-secondary p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            {subtext && <p className="mt-0.5 truncate text-xs text-muted-foreground/80">{subtext}</p>}
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightBanner({ onDismiss, visible }: { onDismiss: () => void; visible: boolean }) {
  if (!visible) return null;

  return (
    <Card className="border-warning/50 bg-warning/5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2">
      <CardContent className="flex items-start gap-3 p-4 sm:p-4">
        <div className="rounded-lg bg-warning/10 p-2">
          <TrendingDown className="h-4 w-4 text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Decline detected</p>
          <p className="text-xs text-muted-foreground">
            Antonio&apos;s weight is down 2kg this month — consider mentioning at Thursday&apos;s visit.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-8 w-8 p-0"
          onClick={onDismiss}
          aria-label="Dismiss insight"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
