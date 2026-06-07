"use client";

import * as React from "react";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated, useIncidents, updateIncident } from "./incident-store";
import { EMERGENCY_CONTACT, severityMeta, typeMeta } from "./data";
import { ackMeta, ackSummary, canResolveIncidents, firstName, incidentTime, memberById, relativeTime } from "./utils";
import type { Comment, Incident } from "./types";

const CURRENT_USER = "maria";

export function IncidentDetailView({ id }: { id: string }) {
  const { role } = useAppShell();
  const incidents = useIncidents();
  const hydrated = useHydrated();

  const incident = incidents.find((i) => i.id === id);

  if (!hydrated) return <DetailSkeleton />;
  if (!incident) return <NotFound />;

  return <Detail incident={incident} canResolve={canResolveIncidents(role)} />;
}

function Detail({ incident, canResolve }: { incident: Incident; canResolve: boolean }) {
  const meta = typeMeta[incident.type];
  const Icon = meta.icon;
  const sev = severityMeta[incident.severity];
  const reporter = memberById(incident.reporterId);
  const isHigh = incident.severity === "high";
  const summary = ackSummary(incident);

  const [comment, setComment] = React.useState("");
  const [resolving, setResolving] = React.useState(false);
  const [note, setNote] = React.useState("");
  const commentIdRef = React.useRef(1);

  const acknowledge = () => {
    updateIncident(incident.id, {
      notifications: incident.notifications.map((n) =>
        n.memberId === CURRENT_USER ? { ...n, status: "acknowledged", at: new Date() } : n
      ),
    });
    toast.success("You acknowledged this incident");
  };

  const addComment = () => {
    const text = comment.trim();
    if (!text) return;
    const c: Comment = { id: `nc-${commentIdRef.current++}`, authorId: CURRENT_USER, text, at: new Date() };
    updateIncident(incident.id, { comments: [...incident.comments, c] });
    setComment("");
  };

  const resolve = () => {
    updateIncident(incident.id, {
      status: "resolved",
      resolutionNote: note.trim() || undefined,
      resolvedAt: new Date(),
      resolvedById: CURRENT_USER,
    });
    setResolving(false);
    toast.success("Incident marked resolved");
  };

  const myNotif = incident.notifications.find((n) => n.memberId === CURRENT_USER);

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
                Reported by <span className="font-medium text-foreground">{reporter ? firstName(reporter.name) : "—"}</span>
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* High-severity emergency shortcuts */}
      {isHigh && incident.status !== "resolved" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
          <span className="text-sm font-medium text-destructive">Need help fast?</span>
          <Button asChild size="sm" variant="destructive">
            <a href={`tel:${EMERGENCY_CONTACT.phone.replace(/[^+\d]/g, "")}`}>
              <Phone className="h-4 w-4" />
              <span className="ml-1">Call {firstName(EMERGENCY_CONTACT.name)}</span>
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/documents">
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
                  <Link href="/documents">
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
              <ul className="space-y-2">
                {incident.notifications.map((n) => {
                  const m = memberById(n.memberId);
                  const a = ackMeta[n.status];
                  return (
                    <li key={n.memberId} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={cn("text-xs font-semibold", m?.color)}>{m?.initials ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m?.name ?? "Unknown"}</p>
                        <p className="truncate text-xs text-muted-foreground">{m?.roleLabel}</p>
                      </div>
                      <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-medium", a.tint)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", a.dot)} aria-hidden="true" />
                        {a.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {myNotif && myNotif.status !== "acknowledged" && (
                <Button variant="outline" size="sm" className="w-full" onClick={acknowledge}>
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
                {incident.resolutionNote && (
                  <p className="text-sm text-foreground/90">{incident.resolutionNote}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {incident.resolvedById ? `${firstName(memberById(incident.resolvedById)?.name ?? "")} · ` : ""}
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
                  <Button variant="outline" size="sm" onClick={() => setResolving(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={resolve}>
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
                {incident.comments.map((c) => {
                  const m = memberById(c.authorId);
                  return (
                    <li key={c.id} className="flex gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className={cn("text-[10px] font-semibold", m?.color)}>{m?.initials ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-medium">{m ? firstName(m.name) : "Unknown"}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(c.at)}</span>
                        </p>
                        <p className="break-words text-sm text-foreground/90">{c.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addComment();
              }}
              className="mt-auto flex items-center gap-2 pt-1"
            >
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment…"
                aria-label="Add a comment"
                className="h-10"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!comment.trim()} aria-label="Send comment">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
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
        <p className="mt-1 text-sm text-muted-foreground">It may have been resolved in another session.</p>
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
