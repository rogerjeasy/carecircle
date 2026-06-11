"use client";

/**
 * /admin/users — the platform user directory and its management surface.
 *
 * Presentational + orchestration only: every mutation calls a server action in
 * src/lib/admin/user-actions.ts, which re-checks `requirePlatformAdmin()`, enforces the safety
 * rails (staff accounts locked, last-owner protection), and writes the audit trail. The UI merely
 * disables what the server would refuse anyway, then `router.refresh()`es so the table re-reads
 * through the audited cross-tenant path.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Ghost,
  KeyRound,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserX,
  Users as UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/admin/sections";
import {
  adminDeleteUser,
  adminRemoveMembership,
  adminSetMembership,
  adminUpdateUser,
} from "@/lib/admin/user-actions";
import type { PlatformUser, PlatformUserKind, PlatformUserMembership } from "@/lib/admin/dashboard-data";

// DB role enum values + labels for the role <Select> (mirrors src/lib/circle/roles.ts).
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner", label: "Owner (coordinator)" },
  { value: "family_admin", label: "Family admin" },
  { value: "family", label: "Family" },
  { value: "caregiver", label: "Caregiver" },
  { value: "read_only", label: "Read-only" },
  { value: "care_recipient", label: "Care recipient" },
  { value: "clinician", label: "Clinician" },
];

const KIND_META: Record<
  PlatformUserKind,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"]; icon: React.ElementType }
> = {
  member: { label: "Member", variant: "outline", icon: UsersIcon },
  guest: { label: "Guest", variant: "secondary", icon: Ghost },
  staff: { label: "Staff", variant: "accent", icon: ShieldCheck },
};

const STATUS_META: Record<
  PlatformUserMembership["status"],
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  active: { label: "Active", variant: "success" },
  invited: { label: "Invited", variant: "info" },
  suspended: { label: "Suspended", variant: "warning" },
};

const FILTERS: { key: "all" | PlatformUserKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "member", label: "Members" },
  { key: "guest", label: "Anonymous guests" },
  { key: "staff", label: "Staff" },
];

function KindBadge({ kind }: { kind: PlatformUserKind }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className="gap-1">
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

/** Two-letter monogram from the name (falling back to the email local-part). */
function initials(user: PlatformUser): string {
  const source = user.name?.trim() || user.email.split("@")[0];
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function authSummary(user: PlatformUser): string {
  const methods: string[] = [];
  if (user.hasPassword) methods.push("Password");
  for (const p of user.oauthProviders) methods.push(p[0].toUpperCase() + p.slice(1));
  return methods.length > 0 ? methods.join(" · ") : "No credentials";
}

export function UsersDirectory({ users }: { users: PlatformUser[] }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["key"]>("all");
  const [managedId, setManagedId] = React.useState<string | null>(null);

  // Derive the managed user from props (not a snapshot) so router.refresh() after a mutation
  // updates the open dialog in place — and closes it if the account was just deleted.
  const managed = managedId ? users.find((u) => u.id === managedId) ?? null : null;

  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (filter !== "all" && u.kind !== filter) return false;
    if (!q) return true;
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.memberships.some((m) => m.circleName.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" aria-hidden />
                User directory
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Every account on the platform — review, correct, or remove to keep it safe.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, circle…"
                className="pl-9"
                aria-label="Search users"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter users">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f.key
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title={users.length === 0 ? "No users yet" : "No users match"}
              description={
                users.length === 0
                  ? "Every account — sign-ups and anonymous demo guests — will appear here."
                  : "Try a different search or filter."
              }
            />
          ) : (
            <>
              {/* Desktop / tablet: full table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">User</th>
                      <th className="px-5 py-2.5 font-medium">Type</th>
                      <th className="px-5 py-2.5 font-medium">Circles &amp; roles</th>
                      <th className="px-5 py-2.5 font-medium">Sign-in</th>
                      <th className="px-5 py-2.5 font-medium">Last seen</th>
                      <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {initials(u)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{u.name ?? "—"}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <KindBadge kind={u.kind} />
                        </td>
                        <td className="max-w-xs px-5 py-3">
                          {u.memberships.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No circle</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {u.memberships.map((m) => (
                                <Badge
                                  key={m.id}
                                  variant={m.status === "suspended" ? "warning" : "outline"}
                                  className="max-w-full"
                                >
                                  <span className="truncate">
                                    {m.circleName} · {m.roleLabel}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <KeyRound className="h-3.5 w-3.5" aria-hidden />
                            {authSummary(u)}
                            {u.emailVerified ? (
                              <BadgeCheck className="h-3.5 w-3.5 text-success" aria-label="Email verified" />
                            ) : null}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                          {u.lastSignIn ?? "Never signed in"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => setManagedId(u.id)}>
                            <UserCog className="h-4 w-4" />
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phone: stacked cards */}
              <ul className="divide-y divide-border md:hidden">
                {filtered.map((u) => (
                  <li key={u.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(u)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{u.name ?? "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <KindBadge kind={u.kind} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {u.memberships.length === 0
                        ? "No circle"
                        : u.memberships.map((m) => `${m.circleName} · ${m.roleLabel}`).join(", ")}
                      {" — "}
                      {u.lastSignIn ?? "never signed in"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setManagedId(u.id)}
                    >
                      <UserCog className="h-4 w-4" />
                      Manage
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <ManageUserDialog user={managed} onClose={() => setManagedId(null)} />
    </>
  );
}

// ── manage dialog ──────────────────────────────────────────────────────────────

function ManageUserDialog({ user, onClose }: { user: PlatformUser | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  // Which button started the in-flight action — every control disables on `pending`, but only
  // the initiating button shows the spinner.
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  // Controlled so the confirmation stays OPEN (with a spinner) while the delete runs, instead of
  // Radix's default close-on-click; `run`'s onSettled closes it when the action finishes.
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Reset feedback whenever a different account is opened (adjust-state-during-render pattern).
  const userId = user?.id;
  const [prevUserId, setPrevUserId] = React.useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setError(null);
    setNotice(null);
    setConfirmDelete(false);
  }

  /** Run a server action, surface its result, and re-read the directory on success. */
  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
    key: string,
    onSettled?: () => void,
  ) => {
    setError(null);
    setNotice(null);
    setPendingKey(key);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setNotice(done);
        router.refresh();
      } else {
        setError(result.error);
      }
      onSettled?.();
    });
  };

  const locked = user?.kind === "staff";

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-xl">
        {user ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {user.name ?? user.email}
                <KindBadge kind={user.kind} />
              </DialogTitle>
              <DialogDescription>
                {authSummary(user)} · {user.lastSignIn ? `last sign-in ${user.lastSignIn}` : "never signed in"}
                {user.emailVerified ? " · email verified" : ""}
              </DialogDescription>
            </DialogHeader>

            {locked ? (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-muted-foreground">
                  Platform staff account — managed via the <code>PLATFORM_ADMIN_EMAILS</code> allowlist,
                  so it can’t be edited or deleted from the console.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* feedback */}
                {error ? (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {error}
                  </p>
                ) : null}
                {notice ? (
                  <p
                    role="status"
                    className="flex items-start gap-2 rounded-xl border border-success/40 bg-success/5 p-3 text-sm text-success"
                  >
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {notice}
                  </p>
                ) : null}

                {/* Account info */}
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("userId", user.id);
                    run(() => adminUpdateUser(fd), "Account info updated.", "save");
                  }}
                >
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Pencil className="h-4 w-4 text-primary" aria-hidden />
                    Account info
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-user-name">Name</Label>
                      <Input
                        id="admin-user-name"
                        name="name"
                        key={`${user.id}-name`}
                        defaultValue={user.name ?? ""}
                        disabled={pending}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-user-email">Email</Label>
                      <Input
                        id="admin-user-email"
                        name="email"
                        type="email"
                        key={`${user.id}-email`}
                        defaultValue={user.email}
                        disabled={pending}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending && pendingKey === "save" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    Save changes
                  </Button>
                </form>

                {/* Memberships */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <UsersIcon className="h-4 w-4 text-primary" aria-hidden />
                    Circle memberships
                  </h3>
                  {user.memberships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This account doesn’t belong to any care circle.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {user.memberships.map((m) => (
                        <MembershipRow
                          key={m.id}
                          membership={m}
                          pending={pending}
                          pendingKey={pendingKey}
                          run={run}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                {/* Danger zone */}
                <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                    Danger zone
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deleting the account removes the sign-in, all circle memberships, sessions and
                    linked logins permanently. Circles where this user is the only remaining member
                    are deleted too, including all their data and files. The audit trail of past
                    actions is preserved.
                  </p>
                  <AlertDialog
                    open={confirmDelete}
                    onOpenChange={(open) => {
                      if (!pending) setConfirmDelete(open);
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={pending}>
                        <Trash2 className="h-4 w-4" />
                        Delete account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {user.email} will be permanently deleted, along with every circle
                          membership, session and linked login. Any circle where they are the only
                          remaining member is deleted with all its data. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={pending}
                          onClick={(e) => {
                            // Keep the dialog open (with the spinner) until the action settles.
                            e.preventDefault();
                            const fd = new FormData();
                            fd.set("userId", user.id);
                            run(() => adminDeleteUser(fd), "Account deleted.", "delete-account", () =>
                              setConfirmDelete(false),
                            );
                          }}
                        >
                          {pending && pendingKey === "delete-account" ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : null}
                          {pending && pendingKey === "delete-account" ? "Deleting…" : "Delete account"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MembershipRow({
  membership: m,
  pending,
  pendingKey,
  run,
}: {
  membership: PlatformUserMembership;
  pending: boolean;
  pendingKey: string | null;
  run: (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
    key: string,
    onSettled?: () => void,
  ) => void;
}) {
  const status = STATUS_META[m.status];
  const spinnerFor = (key: string) => pending && pendingKey === key;
  // Controlled for the same reason as the account-delete confirm: stay open + spin while running.
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  return (
    <li className="space-y-2 rounded-xl border border-border/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium">{m.circleName}</p>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={m.role}
          disabled={pending}
          onValueChange={(role) => {
            if (role === m.role) return;
            const fd = new FormData();
            fd.set("membershipId", m.id);
            fd.set("role", role);
            run(() => adminSetMembership(fd), "Role updated.", `role:${m.id}`);
          }}
        >
          <SelectTrigger className="h-9 w-44 text-sm" aria-label={`Role in ${m.circleName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("membershipId", m.id);
            fd.set("status", m.status === "suspended" ? "active" : "suspended");
            run(
              () => adminSetMembership(fd),
              m.status === "suspended" ? "Member reactivated." : "Member suspended.",
              `suspend:${m.id}`,
            );
          }}
        >
          {spinnerFor(`suspend:${m.id}`) ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserX className="h-4 w-4" />
          )}
          {m.status === "suspended" ? "Reactivate" : "Suspend"}
        </Button>
        <AlertDialog
          open={confirmRemove}
          onOpenChange={(open) => {
            if (!pending) setConfirmRemove(open);
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from {m.circleName}?</AlertDialogTitle>
              <AlertDialogDescription>
                The member loses access to this circle immediately. Their account and other
                memberships stay intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={pending}
                onClick={(e) => {
                  // Keep the dialog open (with the spinner) until the action settles.
                  e.preventDefault();
                  const fd = new FormData();
                  fd.set("membershipId", m.id);
                  run(
                    () => adminRemoveMembership(fd),
                    "Member removed from the circle.",
                    `remove:${m.id}`,
                    () => setConfirmRemove(false),
                  );
                }}
              >
                {spinnerFor(`remove:${m.id}`) ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {spinnerFor(`remove:${m.id}`) ? "Removing…" : "Remove member"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
