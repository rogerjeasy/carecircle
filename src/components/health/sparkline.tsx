"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useReducedMotion } from "./use-reduced-motion";
import type { ChartPoint } from "./utils";

/** A tiny embedded area sparkline. Resizes cleanly via ResponsiveContainer (width 100%). */
export function Sparkline({
  data,
  color,
  height = 48,
}: {
  data: ChartPoint[];
  color: string;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const gradientId = React.useId();

  if (data.length === 0) {
    return <div style={{ height }} className="rounded-lg bg-muted/40" aria-hidden="true" />;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduced}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
