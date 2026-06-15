"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Mail, Plus, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccessCell } from "./badges";
import { ROLES } from "./data";
import { roleCapabilities } from "./utils";
import type { CircleRole, Invite } from "./types";

interface Row {
  id: string;
  email: string;
  role: CircleRole;
  touched: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let rowCounter = 1;
const newRow = (): Row => ({ id: `row-${rowCounter++}`, email: "", role: "family", touched: false });

export interface InviteFormProps {
  /** Performs the real invite and returns the created invites (or [] on failure). */
  onSubmit: (rows: { email: string; role: CircleRole }[], note: string) => Promise<Invite[]>;
  onInvited: (invites: Invite[]) => void;
  onCancel: () => void;
}

/** The invite form: repeatable email+role rows, a note, and a live role-capability summary. */
export function InviteForm({ onSubmit, onInvited, onCancel }: InviteFormProps) {
  const t = useTranslations("people");
  const [rows, setRows] = React.useState<Row[]>(() => [newRow()]);
  const [note, setNote] = React.useState("");
  const [summaryRole, setSummaryRole] = React.useState<CircleRole>("family");
  const [phase, setPhase] = React.useState<"form" | "done">("form");
  const [sent, setSent] = React.useState<Invite[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const emailError = (r: Row) =>
    r.touched && r.email.trim() !== "" && !EMAIL_RE.test(r.email.trim()) ? t("inviteForm.invalidEmail") : undefined;

  const validRows = rows.filter((r) => EMAIL_RE.test(r.email.trim()));
  const canSubmit = validRows.length > 0 && !rows.some((r) => r.email.trim() !== "" && !EMAIL_RE.test(r.email.trim()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRows((prev) => prev.map((r) => ({ ...r, touched: true })));
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const created = await onSubmit(
      validRows.map((r) => ({ email: r.email.trim(), role: r.role })),
      note
    );
    setSubmitting(false);
    if (created.length === 0) return; // failure — the caller surfaces the error; stay on the form
    setSent(created);
    setPhase("done");
  };

  // ---- Success state ----
  if (phase === "done") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success motion-safe:animate-in motion-safe:zoom-in-50">
              <Check className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold">
              {sent.length === 1 ? t("inviteForm.doneTitleOne") : t("inviteForm.doneTitleMany", { count: sent.length })}
            </p>
            <p className="text-sm text-muted-foreground">{t("inviteForm.doneBody")}</p>
          </div>
          <ul className="mt-5 space-y-2">
            {sent.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{inv.email}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{t(`roles.${inv.role}.label` as "roles.coordinator.label")}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
          <div className="flex justify-end">
            <Button type="button" onClick={() => onInvited(sent)}>
              {t("inviteForm.done")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_17rem]">
          {/* Form column */}
          <div className="min-w-0 space-y-4">
            <div className="space-y-3">
              {rows.map((row, i) => {
                const err = emailError(row);
                return (
                  <div key={row.id} className="space-y-1.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`email-${row.id}`} className="sr-only">
                          {t("inviteForm.emailFor", { n: i + 1 })}
                        </Label>
                        <Input
                          id={`email-${row.id}`}
                          type="email"
                          inputMode="email"
                          value={row.email}
                          onChange={(e) => update(row.id, { email: e.target.value })}
                          onBlur={() => update(row.id, { touched: true })}
                          placeholder={t("inviteForm.emailPlaceholder")}
                          aria-invalid={err ? true : undefined}
                          aria-describedby={err ? `email-${row.id}-error` : undefined}
                          className={cn(err && "border-destructive focus-visible:ring-destructive")}
                        />
                      </div>
                      <div className="flex items-start gap-2">
                        <Select
                          value={row.role}
                          onValueChange={(v) => {
                            update(row.id, { role: v as CircleRole });
                            setSummaryRole(v as CircleRole);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-44" aria-label={t("inviteForm.roleFor", { n: i + 1 })}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.key} value={r.key}>
                                {t(`roles.${r.key}.label` as "roles.coordinator.label")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {rows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-muted-foreground"
                            onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                            aria-label={t("inviteForm.removeInvite", { n: i + 1 })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {err && (
                      <p id={`email-${row.id}-error`} className="text-xs font-medium text-destructive" role="alert">
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((prev) => [...prev, newRow()])}
              >
                <Plus className="h-4 w-4" />
                <span className="ml-1">{t("inviteForm.addAnother")}</span>
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-note">{t("inviteForm.noteLabel")}</Label>
              <Textarea
                id="invite-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("inviteForm.notePlaceholder")}
                rows={2}
              />
            </div>
          </div>

          {/* Live role summary */}
          <aside className="min-w-0 rounded-2xl border bg-muted/30 p-4 lg:self-start">
            <div className="mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">
                {t("inviteForm.summaryCan", { role: t(`roles.${summaryRole}.label` as "roles.coordinator.label") })}
              </p>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {t(`roles.${summaryRole}.blurb` as "roles.coordinator.blurb")}
            </p>
            <ul className="space-y-1.5">
              {roleCapabilities(summaryRole).map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm">{t(`capabilities.${c.key}` as "capabilities.timeline")}</span>
                  <AccessCell access={c.access} />
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {t("inviteForm.cancel")}
          </Button>
          <Button type="submit" disabled={!canSubmit || submitting} className="min-w-[9rem]">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                <span className="ml-1">{t("inviteForm.sending")}</span>
              </>
            ) : (
              <span>{validRows.length > 1 ? t("inviteForm.sendN", { count: validRows.length }) : t("inviteForm.sendOne")}</span>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
