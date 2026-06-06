"use client";

import { Clock, MoreHorizontal, Pencil, Pill, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GatedControl } from "./gated-control";
import { SupplyPill } from "./supply-pill";
import { LOW_SUPPLY_THRESHOLD } from "./data";
import type { Medication } from "./types";

export interface MedCardProps {
  med: Medication;
  canManage: boolean;
  onToggleActive: (next: boolean) => void;
  onEdit: () => void;
  onCreateRefill: () => void;
}

/** A card in the "All medications" grid: identity, schedule, prescriber, supply, active toggle. */
export function MedCard({ med, canManage, onToggleActive, onEdit, onCreateRefill }: MedCardProps) {
  const low = med.supplyDays <= LOW_SUPPLY_THRESHOLD;
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Pill className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">
              {med.name} <span className="font-normal text-muted-foreground">{med.strength}</span>
            </p>
            <p className="truncate text-sm text-muted-foreground">{med.purpose}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 h-8 w-8 shrink-0"
                aria-label={`Options for ${med.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={canManage ? onEdit : undefined} disabled={!canManage}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateRefill}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create refill task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="flex items-start gap-2 text-muted-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{med.schedule}</span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Prescribed by {med.prescriber}</span>
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <SupplyPill days={med.supplyDays} />
            {low && (
              <GatedControl canManage={canManage}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-warning"
                  onClick={onCreateRefill}
                >
                  Refill
                </Button>
              </GatedControl>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">{med.active ? "Active" : "Paused"}</span>
            <GatedControl canManage={canManage}>
              <Switch checked={med.active} onCheckedChange={onToggleActive} aria-label={`${med.name} active`} />
            </GatedControl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
