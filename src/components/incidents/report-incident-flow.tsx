"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  Phone,
  ShieldAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "./form-field";
import { reportIncident, fetchReportContext } from "@/lib/incidents/actions";
import { severityMeta, typeMeta } from "./data";
import { firstName } from "./utils";
import type { IncidentReportContext, IncidentType, Severity } from "./types";

const TYPES: IncidentType[] = ["fall", "hospitalization", "emergency", "other"];
const SEVERITIES: Severity[] = ["low", "medium", "high"];

function joinNames(names: string[]): string {
  if (names.length === 0) return "No one";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export interface ReportIncidentFlowProps {
  onClose: () => void;
  /** Called with the new incident id once reported (e.g. to navigate). */
  onReported?: (id: string) => void;
}

/** The multi-step report flow: type → details/severity/notify → reassuring confirmation. */
export function ReportIncidentFlow({ onClose, onReported }: ReportIncidentFlowProps) {
  const router = useRouter();
  const [now] = React.useState(() => new Date());
  const [step, setStep] = React.useState<"type" | "details" | "done">("type");
  const [type, setType] = React.useState<IncidentType | null>(null);
  const [severity, setSeverity] = React.useState<Severity>("low");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(format(now, "yyyy-MM-dd"));
  const [time, setTime] = React.useState(format(now, "HH:mm"));
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [notify, setNotify] = React.useState<Set<string>>(() => new Set());
  const [triedSubmit, setTriedSubmit] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [newId, setNewId] = React.useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // The real circle context (members to notify, recipient name, emergency contact).
  const [ctx, setCtx] = React.useState<IncidentReportContext | null>(null);
  const [ctxLoading, setCtxLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    fetchReportContext()
      .then((c) => {
        if (!active || !c) return;
        setCtx(c);
        setNotify(new Set(c.defaultNotifyIds));
      })
      .catch(() => {
        /* keep an empty notify list — reporting still works */
      })
      .finally(() => {
        if (active) setCtxLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Revoke the object URL when the photo changes / on unmount (avoid leaks).
  React.useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const members = ctx?.members ?? [];
  const recipientName = ctx?.recipientName ?? "your loved one";
  const emergencyContact = ctx?.emergencyContact ?? null;

  const isHigh = severity === "high";
  const descError = triedSubmit && description.trim().length < 3 ? "Please describe what happened" : undefined;

  const toggleNotify = (id: string) =>
    setNotify((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setPhoto = (file: File | null) => {
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setPhotoFile(file);
  };

  const notifiedNames = members.filter((m) => notify.has(m.id)).map((m) => firstName(m.name));

  const submit = async () => {
    setTriedSubmit(true);
    if (!type || description.trim().length < 3) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({ type, severity, description: description.trim(), date, time, notify: [...notify] }),
    );
    if (photoFile) fd.set("photo", photoFile);

    const res = await reportIncident(fd);
    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    setNewId(res.data.id);
    setSubmitting(false);
    setStep("done");
    onReported?.(res.data.id);
    // Refresh server components (incidents list, dashboard, timeline) so the new incident appears.
    router.refresh();
  };

  /* ----------------------------- Step: type ----------------------------- */
  if (step === "type") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mb-4 text-sm text-muted-foreground">What kind of incident is it?</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TYPES.map((t) => {
              const meta = typeMeta[t];
              const Icon = meta.icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setStep("details");
                  }}
                  className={cn(
                    "flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-4 text-center transition-all",
                    "hover:border-primary/50 hover:bg-muted/50 motion-safe:hover:-translate-y-0.5",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    type === t && "border-primary ring-2 ring-primary"
                  )}
                >
                  <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl", meta.tint)}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="font-semibold leading-tight">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{meta.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- Step: done ----------------------------- */
  if (step === "done") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success motion-safe:animate-in motion-safe:zoom-in-50">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold">Incident reported</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {notifiedNames.length > 0
                  ? `${joinNames(notifiedNames)} ${notifiedNames.length === 1 ? "has" : "have"} been notified.`
                  : "Saved to the circle's record."}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Next steps</p>
            {emergencyContact?.phone && (
              <a
                href={`tel:${emergencyContact.phone.replace(/[^+\d]/g, "")}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Call {emergencyContact.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{emergencyContact.phone}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </a>
            )}
            <NextStepLink href="/emergency-card" label="Open Emergency Card" sub="Key details for responders" />
            {newId && <NextStepLink href={`/incidents/${newId}`} label="View incident" sub="Track responses & resolve" />}
          </div>
        </div>
        <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------- Step: details ---------------------------- */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {/* Chosen type recap */}
        {type && (
          <button
            type="button"
            onClick={() => setStep("type")}
            className="flex w-full items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{typeMeta[type].label}</span>
            <span className="ml-auto text-xs text-muted-foreground">Change</span>
          </button>
        )}

        {/* Severity */}
        <FormField htmlFor="severity" label="How severe is it?">
          <div id="severity" className="grid grid-cols-3 gap-2">
            {SEVERITIES.map((s) => {
              const active = severity === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    !active && "border-border hover:bg-muted",
                    active && s === "high" && "border-destructive bg-destructive/10 text-destructive",
                    active && s === "medium" && "border-warning bg-warning/10 text-warning",
                    active && s === "low" && "border-primary bg-primary/10 text-primary"
                  )}
                >
                  {severityMeta[s].label}
                </button>
              );
            })}
          </div>
        </FormField>

        {/* High-severity emphasis */}
        {isHigh && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 motion-safe:animate-in motion-safe:fade-in">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              This looks urgent
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If {recipientName} is in danger, call emergency services first.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {emergencyContact?.phone && (
                <Button asChild size="sm" variant="destructive">
                  <a href={`tel:${emergencyContact.phone.replace(/[^+\d]/g, "")}`}>
                    <Phone className="h-4 w-4" />
                    <span className="ml-1">Call {firstName(emergencyContact.name)}</span>
                  </a>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link href="/emergency-card">
                  <ExternalLink className="h-4 w-4" />
                  <span className="ml-1">Emergency Card</span>
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* What happened */}
        <FormField htmlFor="description" label="What happened?" required error={descError}>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Describe what happened, who was there, and how ${recipientName} is doing now…`}
            rows={4}
            aria-invalid={descError ? true : undefined}
            className={cn(descError && "border-destructive focus-visible:ring-destructive")}
          />
        </FormField>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <FormField htmlFor="date" label="Date">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField htmlFor="time" label="Time">
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </FormField>
        </div>

        {/* Photo */}
        <FormField htmlFor="photo" label="Photo" hint="Optional">
          <input
            ref={photoInputRef}
            id="photo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(f);
              e.target.value = "";
            }}
          />
          {photoUrl ? (
            <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Incident photo preview" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Photo attached</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPhoto(null)} aria-label="Remove photo">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()}>
              <Camera className="h-4 w-4" />
              <span className="ml-1">Add a photo</span>
            </Button>
          )}
        </FormField>

        {/* Notify */}
        <FormField htmlFor="notify" label="Who should be notified now?">
          {ctxLoading ? (
            <ul className="space-y-1.5">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : members.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              No other members to notify yet.
            </p>
          ) : (
            <ul id="notify" className="space-y-1.5">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={cn("text-xs font-semibold", m.color)}>{m.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.roleLabel}</p>
                  </div>
                  <Switch
                    checked={notify.has(m.id)}
                    onCheckedChange={() => toggleNotify(m.id)}
                    aria-label={`Notify ${m.name}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </FormField>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep("type")} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1">Back</span>
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={submitting}
            variant={isHigh ? "destructive" : "default"}
            className="min-w-[11rem]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                <span className="ml-1">Reporting…</span>
              </>
            ) : (
              <span>Report &amp; notify</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NextStepLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
