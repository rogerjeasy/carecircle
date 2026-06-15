"use client";

import * as React from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Medication } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PrintMedicationListProps {
  meds: Medication[];
  /** The care recipient's real name shown in the sheet header (null = no profile yet). */
  recipientName: string | null;
}

/** A "Print / share" action that opens a clean, printable summary sheet of the medication list. */
export function PrintMedicationList({ meds, recipientName }: PrintMedicationListProps) {
  const t = useTranslations("medications");
  const [open, setOpen] = React.useState(false);
  const dateLabel = format(new Date(), "EEEE, MMMM d, yyyy");
  const active = meds.filter((m) => !m.discontinued);
  const discontinued = meds.filter((m) => m.discontinued);

  // Translated builders live inside the component so they can resolve message strings via `t`.
  const buildRows = (rows: Medication[]): string =>
    rows
      .map(
        (m) => `<tr>
        <td><strong>${escapeHtml(m.name)}</strong> ${escapeHtml(m.strength)}</td>
        <td>${escapeHtml(m.schedule)}</td>
        <td>${escapeHtml(m.purpose)}</td>
        <td>${escapeHtml(m.prescriber)}</td>
        <td>${escapeHtml(t("supply.days", { days: m.supplyDays }))}</td>
      </tr>`
      )
      .join("");

  const buildPrintHtml = (): string => {
    const metaPrefix = recipientName ? `${escapeHtml(recipientName)} · ` : "";
    return `<!doctype html><html><head><meta charset="utf-8" />
  <title>${escapeHtml(t("print.shareHeader", { date: dateLabel }))}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; color: #1B231F; margin: 32px; }
    h1 { font-size: 20px; margin: 0 0 2px; }
    .meta { color: #6B716C; font-size: 12px; margin-bottom: 20px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #6B716C; margin: 24px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; border-bottom: 2px solid #E6E3DC; padding: 6px 8px; color: #6B716C; font-weight: 600; }
    td { border-bottom: 1px solid #EFEDE8; padding: 8px; vertical-align: top; }
    td:last-child, th:last-child { text-align: right; white-space: nowrap; }
    .discont td { color: #9AA39C; }
    footer { margin-top: 28px; font-size: 11px; color: #9AA39C; }
    @media print { body { margin: 12mm; } }
  </style></head><body>
    <h1>${escapeHtml(t("print.title"))}</h1>
    <div class="meta">${metaPrefix}${escapeHtml(t("print.generated", { date: dateLabel }))}</div>
    <h2>${escapeHtml(t("print.activeHeading", { count: active.length }))}</h2>
    <table><thead><tr><th>${escapeHtml(t("print.colMedication"))}</th><th>${escapeHtml(t("print.colSchedule"))}</th><th>${escapeHtml(t("print.colPurpose"))}</th><th>${escapeHtml(t("print.colPrescriber"))}</th><th>${escapeHtml(t("print.colSupply"))}</th></tr></thead>
      <tbody>${buildRows(active)}</tbody></table>
    ${
      discontinued.length
        ? `<h2>${escapeHtml(t("print.discontinuedHeading", { count: discontinued.length }))}</h2>
           <table class="discont"><tbody>${discontinued
             .map((m) => `<tr><td><strong>${escapeHtml(m.name)}</strong> ${escapeHtml(m.strength)}</td><td colspan="4">${escapeHtml(m.discontinuedNote ?? t("allMeds.discontinuedDefault"))}</td></tr>`)
             .join("")}</tbody></table>`
        : ""
    }
    <footer>${escapeHtml(t("print.footer"))}</footer>
  </body></html>`;
  };

  const buildShareText = (): string => {
    const lines = active.map((m) => `• ${m.name} ${m.strength} — ${m.schedule} (${m.purpose})`);
    return `${t("print.shareHeader", { date: dateLabel })}\n${lines.join("\n")}`;
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=820,height=920");
    if (!w) {
      toast.error(t("print.popupBlocked"));
      return;
    }
    w.document.write(buildPrintHtml());
    w.document.close();
    w.focus();
    // Give the new document a tick to lay out before printing.
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* user can print manually */
      }
    }, 350);
  };

  const handleShare = async () => {
    const text = buildShareText();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t("print.title"), text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success(t("print.copied"));
      } else {
        toast.error(t("print.shareUnsupported"));
      }
    } catch {
      /* user cancelled the share sheet — ignore */
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      toast.success(t("print.copied"));
    } catch {
      toast.error(t("print.copyFailed"));
    }
  };

  return (
    <>
      <Button variant="outline" className="h-11 shrink-0" onClick={() => setOpen(true)}>
        <Printer className="h-4 w-4" />
        <span className="ml-1">{t("print.button")}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-12 text-left">
            <DialogTitle>{t("print.title")}</DialogTitle>
            <DialogDescription>{t("print.dialogDesc")}</DialogDescription>
          </DialogHeader>

          {/* Scrollable preview */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {recipientName ? `${recipientName} · ` : ""}
              {dateLabel}
            </p>

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("print.activeHeading", { count: active.length })}
            </h3>
            <ul className="mt-2 divide-y rounded-xl border">
              {active.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 p-3">
                  <span className="min-w-0 font-medium">
                    {m.name} <span className="font-normal text-muted-foreground">{m.strength}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{m.schedule}</span>
                  <span className="w-full text-xs text-muted-foreground">
                    {m.purpose} · {m.prescriber} · {t("print.supplyLabel", { days: m.supplyDays })}
                  </span>
                </li>
              ))}
            </ul>

            {discontinued.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("print.discontinuedHeading", { count: discontinued.length })}
                </h3>
                <ul className="mt-2 divide-y rounded-xl border">
                  {discontinued.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 p-3 text-muted-foreground">
                      <span className="font-medium line-through decoration-muted-foreground/40">
                        {m.name} {m.strength}
                      </span>
                      <span className="text-xs">{m.discontinuedNote ?? t("allMeds.discontinuedDefault")}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 border-t bg-background px-6 py-3">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="ghost" onClick={handleCopy} className="sm:mr-auto">
                <Copy className="h-4 w-4" />
                <span className="ml-1">{t("print.copy")}</span>
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                <span className="ml-1">{t("print.share")}</span>
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                <span className="ml-1">{t("print.print")}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
