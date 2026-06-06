"use client";

import * as React from "react";
import {
  Ban,
  CalendarClock,
  Check,
  CheckCircle2,
  ListChecks,
  MapPin,
  NotebookPen,
  Pencil,
  Plus,
  Send,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResponsiveModal } from "./responsive-modal";
import { GatedControl } from "./gated-control";
import { AssignedMember } from "./member-avatar";
import { StatusBadge } from "./status-badge";
import { kindMeta, MEMBERS } from "./data";
import { dateTimeLabel, firstName, memberById, prepProgress } from "./utils";
import type { Appointment, PrepQuestion } from "./types";

export interface AppointmentDetailProps {
  appt: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onPatch: (patch: Partial<Appointment>) => void;
  onEdit: () => void;
  /** Fired after a successful "Save & post to timeline" so the screen can toast. */
  onPostToTimeline: () => void;
}

/** Full appointment detail: info, prep checklist, visit summary, assign, edit/cancel. */
export function AppointmentDetail({
  appt,
  open,
  onOpenChange,
  canManage,
  onPatch,
  onEdit,
  onPostToTimeline,
}: AppointmentDetailProps) {
  const Icon = kindMeta[appt.kind].icon;
  const member = memberById(appt.assignedMemberId);
  const prep = prepProgress(appt);

  const [newPrep, setNewPrep] = React.useState("");
  const [summary, setSummary] = React.useState(appt.visitSummary ?? "");
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [savingSummary, setSavingSummary] = React.useState(false);
  const prepIdRef = React.useRef(1);

  const isClosed = appt.status === "cancelled";

  const togglePrep = (id: string, done: boolean) => {
    onPatch({ prep: appt.prep.map((q) => (q.id === id ? { ...q, done } : q)) });
  };

  const removePrep = (id: string) => {
    onPatch({ prep: appt.prep.filter((q) => q.id !== id) });
  };

  const addPrep = () => {
    const text = newPrep.trim();
    if (!text) return;
    const q: PrepQuestion = { id: `new-prep-${prepIdRef.current++}`, text, done: false };
    onPatch({ prep: [...appt.prep, q] });
    setNewPrep("");
  };

  const saveAndPost = async () => {
    if (!summary.trim() || savingSummary) return;
    setSavingSummary(true);
    await new Promise((r) => setTimeout(r, 600));
    onPatch({
      visitSummary: summary.trim(),
      postedToTimeline: true,
      status: appt.status === "cancelled" ? "cancelled" : "completed",
    });
    setSavingSummary(false);
    onPostToTimeline();
  };

  const assignValue = appt.assignedMemberId ?? "unassigned";

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2.5">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", kindMeta[appt.kind].tint)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate">{appt.title}</span>
        </span>
      }
      description={kindMeta[appt.kind].label}
      headerAccessory={
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <StatusBadge status={appt.status} />
          {appt.postedToTimeline && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              On timeline
            </span>
          )}
        </div>
      }
    >
      {/* Scroll body */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 sm:px-6">
        {/* Key info */}
        <div className="space-y-2.5 text-sm">
          <InfoRow icon={Stethoscope} label="Provider">
            {appt.provider}
          </InfoRow>
          <InfoRow icon={CalendarClock} label="When">
            <span className="font-medium text-foreground">{dateTimeLabel(appt.start)}</span>
            <span className="text-muted-foreground"> · {appt.durationMin} min</span>
          </InfoRow>
          {appt.location && (
            <InfoRow icon={MapPin} label="Location">
              {appt.location}
            </InfoRow>
          )}
        </div>

        {/* Assigned-to selector */}
        <div className="space-y-2">
          <Label htmlFor="assign" className="text-sm font-semibold">
            Assigned to
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <AssignedMember member={member} />
            <GatedControl canManage={canManage}>
              <Select
                value={assignValue}
                onValueChange={(v) => onPatch({ assignedMemberId: v === "unassigned" ? null : v })}
              >
                <SelectTrigger id="assign" className="w-full sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {MEMBERS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {firstName(m.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </GatedControl>
          </div>
        </div>

        {appt.notes && (
          <div className="rounded-xl bg-muted/50 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
            <p className="whitespace-pre-wrap text-foreground">{appt.notes}</p>
          </div>
        )}

        <Separator />

        {/* Prep questions */}
        <section className="space-y-3" aria-label="Prep questions">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Prep questions</h3>
            {prep.total > 0 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {prep.done}/{prep.total} ready
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Things to ask the doctor at this visit.</p>

          {appt.prep.length > 0 ? (
            <ul className="space-y-1.5">
              {appt.prep.map((q) => (
                <li
                  key={q.id}
                  className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2"
                >
                  <Checkbox
                    id={`prep-${q.id}`}
                    checked={q.done}
                    onCheckedChange={(c) => togglePrep(q.id, c === true)}
                    disabled={!canManage}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`prep-${q.id}`}
                    className={cn(
                      "min-w-0 flex-1 cursor-pointer text-sm font-normal leading-snug",
                      q.done && "text-muted-foreground line-through"
                    )}
                  >
                    {q.text}
                  </Label>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => removePrep(q.id)}
                      aria-label={`Remove "${q.text}"`}
                      className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
              No questions yet{canManage ? " — add one below." : "."}
            </p>
          )}

          {canManage && (
            <div className="flex items-center gap-2">
              <Input
                value={newPrep}
                onChange={(e) => setNewPrep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPrep();
                  }
                }}
                placeholder="Add a question to ask…"
                aria-label="Add a prep question"
                className="h-10"
              />
              <Button type="button" variant="outline" onClick={addPrep} disabled={!newPrep.trim()}>
                <Plus className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Add</span>
              </Button>
            </div>
          )}
        </section>

        <Separator />

        {/* Visit summary */}
        <section className="space-y-3" aria-label="Visit summary">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Visit summary</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Fill this in after the visit, then share it with the family on the timeline.
          </p>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={!canManage}
            placeholder="What happened at the visit? Outcomes, changes, next steps…"
            rows={4}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {appt.postedToTimeline
                ? "Shared with the family timeline."
                : "Posting adds a note to the shared timeline."}
            </p>
            <GatedControl canManage={canManage}>
              <Button
                type="button"
                variant="accent"
                onClick={saveAndPost}
                disabled={!summary.trim() || savingSummary}
                className="w-full sm:w-auto"
              >
                {savingSummary ? (
                  <>
                    <Check className="h-4 w-4 animate-pulse motion-reduce:animate-none" />
                    <span className="ml-1">Saving…</span>
                  </>
                ) : appt.postedToTimeline ? (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="ml-1">Update &amp; re-post</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="ml-1">Save &amp; post to timeline</span>
                  </>
                )}
              </Button>
            </GatedControl>
          </div>
        </section>
      </div>

      {/* Sticky footer: edit / cancel */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          {canManage && !isClosed ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmCancel(true)}
            >
              <Ban className="h-4 w-4" />
              <span className="ml-1">Cancel appointment</span>
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <GatedControl canManage={canManage}>
              <Button type="button" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                <span className="ml-1">Edit</span>
              </Button>
            </GatedControl>
          </div>
        </div>
      </div>

      {/* Confirm cancel */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              “{appt.title}” will be marked cancelled. You can still see it in the Past list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onPatch({ status: "cancelled" });
                setConfirmCancel(false);
              }}
            >
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveModal>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Stethoscope;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <span className="sr-only">{label}: </span>
        <span className="text-foreground">{children}</span>
      </div>
    </div>
  );
}
