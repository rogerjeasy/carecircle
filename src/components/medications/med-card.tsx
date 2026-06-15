"use client";

import { Clock, FileText, MoreHorizontal, Pencil, Pill, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("medications");
  const low = med.supplyDays <= LOW_SUPPLY_THRESHOLD;
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-4">
        <div className="flex items-start gap-3">
          {med.photoUrl ? (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={med.photoUrl} alt={med.name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Pill className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
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
                aria-label={t("card.optionsFor", { name: med.name })}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={canManage ? onEdit : undefined} disabled={!canManage}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("card.editDetails")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateRefill}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t("refill.create")}
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
            <span className="truncate">{t("card.prescribedBy", { name: med.prescriber })}</span>
          </p>
        </div>

        {/* Attachments: image thumbnails open in a new tab; documents are download links */}
        {med.attachments && med.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {med.attachments.map((a) =>
              a.kind === "image" && a.url ? (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 w-12 overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-90"
                  title={a.fileName}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.fileName} className="h-full w-full object-cover" />
                </a>
              ) : (
                <a
                  key={a.id}
                  href={a.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/70"
                  title={a.fileName}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="max-w-[8rem] truncate">{a.fileName}</span>
                </a>
              )
            )}
          </div>
        )}

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
                  {t("refill.short")}
                </Button>
              </GatedControl>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">{med.active ? t("card.active") : t("card.paused")}</span>
            <GatedControl canManage={canManage}>
              <Switch checked={med.active} onCheckedChange={onToggleActive} aria-label={t("card.activeToggleAria", { name: med.name })} />
            </GatedControl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
