"use client";

/**
 * "Outage notifications" card on /admin/system — manage who is emailed when a platform service
 * goes down or recovers. Orchestration only: every mutation calls a server action in
 * src/lib/admin/notification-actions.ts (admin-gated, validated, logged), then refreshes.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellRing, Check, Loader2, Mail, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/admin/sections";
import {
  addStatusRecipient,
  removeStatusRecipient,
  updateStatusRecipient,
} from "@/lib/admin/notification-actions";
import type { StatusRecipient } from "@/lib/admin/dashboard-data";

type ActionResult = { ok: true } | { ok: false; error: string };

export function StatusRecipients({ recipients }: { recipients: StatusRecipient[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const run = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" aria-hidden />
          Outage notifications
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These people are emailed the moment a service goes down, and again when it recovers.
          Detection runs every few minutes (and continuously while this page is open).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {recipients.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No alert recipients"
            description="Nobody is notified about outages right now — add at least one email below."
          />
        ) : (
          <ul className="space-y-2">
            {recipients.map((r) =>
              editingId === r.id ? (
                <EditRow key={r.id} recipient={r} pending={pending} run={run} onCancel={() => setEditingId(null)} />
              ) : (
                <li
                  key={r.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3",
                    !r.active && "opacity-70",
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.name ?? "—"}</p>
                  </div>
                  <Badge variant={r.active ? "success" : "secondary"}>
                    {r.active ? "Active" : "Paused"}
                  </Badge>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Switch
                      checked={r.active}
                      disabled={pending}
                      aria-label={`${r.active ? "Pause" : "Resume"} alerts for ${r.email}`}
                      onCheckedChange={(checked) => {
                        const fd = new FormData();
                        fd.set("id", r.id);
                        fd.set("email", r.email);
                        fd.set("name", r.name ?? "");
                        fd.set("active", String(checked));
                        run(() => updateStatusRecipient(fd));
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      aria-label={`Edit ${r.email}`}
                      onClick={() => setEditingId(r.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          aria-label={`Remove ${r.email}`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this recipient?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {r.email} will stop receiving outage and recovery alerts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("id", r.id);
                              run(() => removeStatusRecipient(fd));
                            }}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}

        {/* Add a recipient */}
        <form
          className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            run(async () => {
              const result = await addStatusRecipient(fd);
              if (result.ok) form.reset();
              return result;
            });
          }}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="status-recipient-email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <Input
              id="status-recipient-email"
              name="email"
              type="email"
              required
              placeholder="ops@example.com"
              disabled={pending}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="status-recipient-name" className="text-xs font-medium text-muted-foreground">
              Name (optional)
            </label>
            <Input id="status-recipient-name" name="name" placeholder="On-call engineer" disabled={pending} />
          </div>
          <Button type="submit" size="sm" disabled={pending} className="shrink-0">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" />}
            Add recipient
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Inline edit form replacing a recipient row. */
function EditRow({
  recipient: r,
  pending,
  run,
  onCancel,
}: {
  recipient: StatusRecipient;
  pending: boolean;
  run: (action: () => Promise<ActionResult>) => void;
  onCancel: () => void;
}) {
  return (
    <li className="rounded-xl border border-primary/40 p-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("id", r.id);
          fd.set("active", String(r.active));
          run(() => updateStatusRecipient(fd));
        }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={`edit-email-${r.id}`} className="text-xs font-medium text-muted-foreground">
            Email
          </label>
          <Input id={`edit-email-${r.id}`} name="email" type="email" required defaultValue={r.email} disabled={pending} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={`edit-name-${r.id}`} className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <Input id={`edit-name-${r.id}`} name="name" defaultValue={r.name ?? ""} disabled={pending} />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-4 w-4" />
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </form>
    </li>
  );
}
