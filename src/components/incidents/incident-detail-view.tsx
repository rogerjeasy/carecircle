"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { acknowledgeIncident, addIncidentComment, resolveIncident } from "@/lib/incidents/actions";
import { severityMeta, typeMeta } from "./data";
import { ackMeta, ackSummary, canResolveIncidents, firstName, incidentTime, relativeTime } from "./utils";
import type { EmergencyContact, Incident, IncidentDetailData } from "./types";

export function IncidentDetailView({ data }: { data: IncidentDetailData | null }) {
  const { role } = useAppShell();
  if (!data) return <NotFound />;
  return (
    <Detail
      incident={data.incident}
      emergencyContact={data.emergencyContact}
      canResolve={canResolveIncidents(role)}
    />
  );
}

function Detail({
  incident,
  emergencyContact,
  canResolve,
}: {
  incident: Incident;
  emergencyContact: EmergencyContact | null;
  canResolve: boolean;
}) {
  const router = useRouter();
  const meta = typeMeta[incident.type];
  const Icon = meta.icon;
  const sev = severityMeta[incident.severity];
  const isHigh = incident.severity === "high";
  const summary = ackSummary(incident);

  const [comment, setComment] = React.useState("");
  const [resolving, setResolving] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const acknowledge = async () => {
    const res = await acknowledgeIncident(incident.id);
    if (!res.ok) return toast.error(res.error);
    toast.success("You acknowledged this incident");
    startTransition(() => router.refresh());
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    const fd = new FormData();
    fd.set("id", incident.id);
    fd.set("body", text);
    const res = await addIncidentComment(fd);
    if (!res.ok) return toast.error(res.error);
    setComment("");
    startTransition(() => router.refresh());
  };

  const resolve = async () => {
    const fd = new FormData();
    fd.set("id", incident.id);
    fd.set("note", note.trim());
    const res = await resolveIncident(fd);
    if (!res.ok) return toast.error(res.error);
    setResolving(false);
    toast.success("Incident marked resolved");
    startTransition(() => router.refresh());
  };

  const canAck = incident.myAck != null && incident.myAck !== "acknowledged";

  return (
    <div className="space-y-5">
      {/* Back + status */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" />
          All incidents
        </Link>
        <Badge variant={incident.status === "resolved" ? "success" : "secondary"} className="gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", incident.status === "resolved" ? "bg-success" : "bg-warning")} aria-hidden="true" />
          {incident.status === "resolved" ? "Resolved" : "Open"}
        </Badge>
      </div>

      {/* Header card */}
      <Card className={cn("p-0", isHigh && incident.status !== "resolved" && "border-destructive/40")}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", meta.tint)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{meta.label}</h1>
              <Badge variant={sev.badge}>{sev.label} severity</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {incidentTime(incident.at)}
              </span>
              <span className="inline-flex items-center gap-1">
                Reported by <span className="font-medium text-foreground">{incident.reporterName}</span>
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* High-severity emergency shortcuts */}
      {isHigh && incident.status !== "resolved" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
          <span className="text-sm font-medium text-destructive">Need help fast?</span>
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
      )}

      {/* Two-column: summary + acks | comments */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        {/* Left */}
        <div className="space-y-5">
          {/* What happened */}
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <h2 className="text-sm font-semibold">What happened</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{incident.description}</p>
              {incident.photoUrl && (
                <div className="overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={incident.photoUrl} alt="Incident photo" className="max-h-64 w-full object-cover" />
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <Link href="/timeline">
                    <FileText className="h-4 w-4" />
                    <span className="ml-1">Timeline event</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/emergency-card">
                    <ExternalLink className="h-4 w-4" />
                    <span className="ml-1">Emergency Card</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgements */}
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Notified &amp; acknowledged</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {summary.acknowledged}/{summary.total} acknowledged
                </span>
              </div>
              {incident.notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one was notified for this incident.</p>
              ) : (
                <ul className="space-y-2">
                  {incident.notifications.map((n) => {
                    const a = ackMeta[n.status];
                    return (
                      <li key={n.membershipId} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={cn("text-xs font-semibold", n.color)}>{n.initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{n.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{n.roleLabel}</p>
                        </div>
                        <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-medium", a.tint)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", a.dot)} aria-hidden="true" />
                          {a.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {canAck && (
                <Button variant="outline" size="sm" className="w-full" onClick={acknowledge} disabled={pending}>
                  <ShieldCheck className="h-4 w-4" />
                  <span className="ml-1">Acknowledge</span>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Resolution */}
          {incident.status === "resolved" ? (
            <Card className="border-success/40 bg-success/5 p-0">
              <CardContent className="space-y-1.5 p-4 sm:p-5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Resolved
                </p>
                {incident.resolutionNote && <p className="text-sm text-foreground/90">{incident.resolutionNote}</p>}
                <p className="text-xs text-muted-foreground">
                  {incident.resolvedByName ? `${incident.resolvedByName} · ` : ""}
                  {incident.resolvedAt ? incidentTime(incident.resolvedAt) : ""}
                </p>
              </CardContent>
            </Card>
          ) : resolving ? (
            <Card>
              <CardContent className="space-y-3 p-4 sm:p-5">
                <h2 className="text-sm font-semibold">Resolve incident</h2>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a short note on how this was resolved (optional)…"
                  rows={3}
                  aria-label="Resolution notes"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setResolving(false)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={resolve} disabled={pending}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="ml-1">Mark resolved</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            canResolve && (
              <Button variant="outline" className="w-full" onClick={() => setResolving(true)}>
                <CheckCircle2 className="h-4 w-4" />
                <span className="ml-1">Resolve incident</span>
              </Button>
            )
          )}
        </div>

        {/* Right: comments */}
        <Card className="p-0">
          <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Coordinating ({incident.comments.length})
            </h2>

            {incident.comments.length === 0 ? (
              <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                No comments yet. Start the conversation.
              </p>
            ) : (
              <ul className="space-y-3">
                {incident.comments.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className={cn("text-[10px] font-semibold", c.authorColor)}>{c.authorInitials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium">{c.authorName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(c.at)}</span>
                      </p>
                      <p className="break-words text-sm text-foreground/90">{c.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={submitComment} className="mt-auto flex items-center gap-2 pt-1">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment…"
                aria-label="Add a comment"
                className="h-10"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!comment.trim() || pending} aria-label="Send comment">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Camera className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">Incident not found</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have been removed, or belongs to another circle.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/incidents">
          <ArrowLeft className="h-4 w-4" />
          <span className="ml-1">Back to incidents</span>
        </Link>
      </Button>
    </div>
  );
}
