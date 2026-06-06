"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Wraps a manager-only control. For managers it renders the control untouched; for everyone else
 * it disables the control and shows a calm "Ask the coordinator" tooltip (the control stays
 * visible for discoverability rather than disappearing).
 */
export function GatedControl({
  canManage,
  children,
}: {
  canManage: boolean;
  children: React.ReactElement<{ disabled?: boolean }>;
}) {
  if (canManage) return children;
  const control = React.cloneElement(children, { disabled: true });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span keeps hover/focus events alive even though the inner control is disabled */}
        <span
          tabIndex={0}
          className="inline-flex rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {control}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">Ask the coordinator</TooltipContent>
    </Tooltip>
  );
}
