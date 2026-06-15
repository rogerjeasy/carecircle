"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Wraps a manager-only control. Managers get the control untouched; everyone else gets it disabled
 * with a calm "Ask the coordinator" tooltip (kept visible for discoverability).
 */
export function GatedControl({
  canManage,
  children,
}: {
  canManage: boolean;
  children: React.ReactElement<{ disabled?: boolean }>;
}) {
  const t = useTranslations("tasks");
  if (canManage) return children;
  const control = React.cloneElement(children, { disabled: true });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {control}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{t("askCoordinator")}</TooltipContent>
    </Tooltip>
  );
}
