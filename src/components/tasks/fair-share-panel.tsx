"use client";

import * as React from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { HandHeart, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBERS } from "./data";
import { fairShare, fairShareMessage, firstName } from "./utils";
import type { Task } from "./types";

/** A custom Y-axis tick: the member's avatar monogram + first name, drawn in-SVG for clean alignment. */
function AvatarTick(props: { x?: number; y?: number; payload?: { value?: string } }) {
  const { x = 0, y = 0, payload } = props;
  const member = MEMBERS.find((m) => m.id === payload?.value);
  if (!member) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-30} y={0} dy={4} textAnchor="end" fontSize={12} fill="hsl(var(--muted-foreground))">
        {firstName(member.name)}
      </text>
      <circle cx={-14} cy={0} r={11} fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
      <text x={-14} y={0} dy={3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(var(--foreground))">
        {member.initials}
      </text>
    </g>
  );
}

export function FairSharePanel({ tasks, className }: { tasks: Task[]; className?: string }) {
  const rows = React.useMemo(() => fairShare(tasks), [tasks]);
  const message = React.useMemo(() => fairShareMessage(rows), [rows]);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const data = rows.map((r) => ({ id: r.member.id, count: r.count, fill: r.member.bar }));
  const Tone = message.tone === "balanced" ? HeartHandshake : HandHeart;

  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight">Fair share this week</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Completed tasks by each person.</p>
        </div>

        <div className="min-h-0 flex-1" aria-hidden="true">
          <ResponsiveContainer width="100%" height={Math.max(140, rows.length * 46)}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
              barCategoryGap={10}
            >
              <XAxis type="number" hide domain={[0, maxCount]} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="id"
                width={92}
                axisLine={false}
                tickLine={false}
                tick={<AvatarTick />}
                interval={0}
              />
              <Bar dataKey="count" radius={[6, 6, 6, 6]} isAnimationActive={false} background={{ fill: "hsl(var(--muted))" }}>
                {data.map((d) => (
                  <Cell key={d.id} fill={d.fill} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  className="fill-muted-foreground"
                  fontSize={12}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Accessible text equivalent of the chart */}
        <ul className="sr-only">
          {rows.map((r) => (
            <li key={r.member.id}>
              {firstName(r.member.name)}: {r.count} completed
            </li>
          ))}
        </ul>

        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm",
            message.tone === "balanced" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}
        >
          <Tone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">{message.text}</span>
        </div>
      </CardContent>
    </Card>
  );
}
