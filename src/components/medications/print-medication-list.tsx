"use client";

import * as React from "react";
import { format } from "date-fns";
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

function buildRows(meds: Medication[]): string {
  return meds
    .map(
      (m) => `<tr>
        <td><strong>${escapeHtml(m.name)}</strong> ${escapeHtml(m.strength)}</td>
        <td>${escapeHtml(m.schedule)}</td>
        <td>${escapeHtml(m.purpose)}</td>
        <td>${escapeHtml(m.prescriber)}</td>
        <td>${m.supplyDays}d</td>
      </tr>`
    )
    .join("");
}

function buildPrintHtml(meds: Medication[], recipientName: string | null, dateLabel: string): string {
  const active = meds.filter((m) => !m.discontinued);
  const discontinued = meds.filter((m) => m.discontinued);
  return `<!doctype html><html><head><meta charset="utf-8" />
  <title>Medication list — ${dateLabel}</title>
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
    <h1>Medication list</h1>
    <div class="meta">${recipientName ? `${escapeHtml(recipientName)} · ` : ""}Generated ${escapeHtml(dateLabel)}</div>
    <h2>Active medications (${active.length})</h2>
    <table><thead><tr><th>Medication</th><th>Schedule</th><th>Purpose</th><th>Prescriber</th><th>Supply</th></tr></thead>
      <tbody>${buildRows(active)}</tbody></table>
    ${
      discontinued.length
        ? `<h2>Discontinued (${discontinued.length})</h2>
           <table class="discont"><tbody>${discontinued
             .map((m) => `<tr><td><strong>${escapeHtml(m.name)}</strong> ${escapeHtml(m.strength)}</td><td colspan="4">${escapeHtml(m.discontinuedNote ?? "Discontinued")}</td></tr>`)
             .join("")}</tbody></table>`
        : ""
    }
    <footer>Kintwadi — please verify against the original prescriptions. Not a substitute for medical advice.</footer>
  </body></html>`;
}

function buildShareText(meds: Medication[], dateLabel: string): string {
  const active = meds.filter((m) => !m.discontinued);
  const lines = active.map((m) => `• ${m.name} ${m.strength} — ${m.schedule} (${m.purpose})`);
  return `Medication list — ${dateLabel}\n${lines.join("\n")}`;
}

export interface PrintMedicationListProps {
  meds: Medication[];
  /** The care recipient's real name shown in the sheet header (null = no profile yet). */
  recipientName: string | null;
}

/** A "Print / share" action that opens a clean, printable summary sheet of the medication list. */
export function PrintMedicationList({ meds, recipientName }: PrintMedicationListProps) {
  const [open, setOpen] = React.useState(false);
  const dateLabel = format(new Date(), "EEEE, MMMM d, yyyy");
  const active = meds.filter((m) => !m.discontinued);
  const discontinued = meds.filter((m) => m.discontinued);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=820,height=920");
    if (!w) {
      toast.error("Allow pop-ups to open the printable sheet");
      return;
    }
    w.document.write(buildPrintHtml(meds, recipientName, dateLabel));
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
    const text = buildShareText(meds, dateLabel);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Medication list", text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success("Medication list copied to clipboard");
      } else {
        toast.error("Sharing isn't supported on this device");
      }
    } catch {
      /* user cancelled the share sheet — ignore */
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(meds, dateLabel));
      toast.success("Medication list copied to clipboard");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <>
      <Button variant="outline" className="h-11 shrink-0" onClick={() => setOpen(true)}>
        <Printer className="h-4 w-4" />
        <span className="ml-1">Print / share</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-12 text-left">
            <DialogTitle>Medication list</DialogTitle>
            <DialogDescription>A clean summary you can print or share with the care team.</DialogDescription>
          </DialogHeader>

          {/* Scrollable preview */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {recipientName ? `${recipientName} · ` : ""}
              {dateLabel}
            </p>

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active medications ({active.length})
            </h3>
            <ul className="mt-2 divide-y rounded-xl border">
              {active.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 p-3">
                  <span className="min-w-0 font-medium">
                    {m.name} <span className="font-normal text-muted-foreground">{m.strength}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{m.schedule}</span>
                  <span className="w-full text-xs text-muted-foreground">
                    {m.purpose} · {m.prescriber} · {m.supplyDays}d supply
                  </span>
                </li>
              ))}
            </ul>

            {discontinued.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Discontinued ({discontinued.length})
                </h3>
                <ul className="mt-2 divide-y rounded-xl border">
                  {discontinued.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 p-3 text-muted-foreground">
                      <span className="font-medium line-through decoration-muted-foreground/40">
                        {m.name} {m.strength}
                      </span>
                      <span className="text-xs">{m.discontinuedNote ?? "Discontinued"}</span>
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
                <span className="ml-1">Copy</span>
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                <span className="ml-1">Share</span>
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                <span className="ml-1">Print</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
