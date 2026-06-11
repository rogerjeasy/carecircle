"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, HeartPulse, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { SettingsSection, Field } from "./section";
import { LANGUAGES, TIMEZONES } from "./data";
import {
  loadAccountSettings,
  updateAccountProfile,
  changePassword,
  deleteAccount,
  type AccountSettings,
} from "@/lib/account/actions";
import {
  loadCircleSettings,
  renameCircle,
  transferOwnership,
  deleteCircle,
  type CircleSettings,
} from "@/lib/circle/settings";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* --------------------------------- Account -------------------------------- */
export function AccountSection() {
  const { setUserImage } = useAppShell();
  const [account, setAccount] = React.useState<AccountSettings | null>(null);
  const [name, setName] = React.useState("");
  const [language, setLanguage] = React.useState(LANGUAGES[0]);
  const [tz, setTz] = React.useState(TIMEZONES[0]);
  const [photoDataUrl, setPhotoDataUrl] = React.useState<string | null>(null);
  const [savingProfile, startProfile] = React.useTransition();
  const [savingPw, startPw] = React.useTransition();
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const pwFormRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    let active = true;
    loadAccountSettings().then((res) => {
      if (!active || !res.ok) return;
      setAccount(res.account);
      setName(res.account.name);
      if (res.account.language) setLanguage(res.account.language);
      if (res.account.timezone) setTz(res.account.timezone);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!account) {
    return (
      <SettingsSection title="Account" description="Your personal details and preferences.">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </SettingsSection>
    );
  }

  const avatarSrc = photoDataUrl ?? account.image ?? undefined;

  const onPickPhoto = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose an image under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("language", language);
    fd.set("timezone", tz);
    const changedPhoto = Boolean(photoDataUrl);
    if (photoDataUrl) fd.set("photo", photoDataUrl);
    startProfile(async () => {
      const res = await updateAccountProfile(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAccount((a) => (a ? { ...a, name, language, timezone: tz, image: res.image } : a));
      setPhotoDataUrl(null);
      // Reflect a new photo in the sidebar/nav immediately (only when it actually changed).
      if (changedPhoto) setUserImage(res.image);
      toast.success("Account updated");
    });
  };

  const savePassword = () => {
    const form = pwFormRef.current;
    if (!form) return;
    const fd = new FormData(form);
    startPw(async () => {
      const res = await changePassword(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      form.reset();
      toast.success("Password updated");
    });
  };

  return (
    <SettingsSection title="Account" description="Your personal details and preferences.">
      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarSrc && <AvatarImage src={avatarSrc} alt="" />}
              <AvatarFallback className="bg-accent/10 text-lg font-semibold text-accent">
                {initialsFrom(name || account.email)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickPhoto(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                Change photo
              </Button>
              <p className="text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field htmlFor="acc-name" label="Full name">
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field htmlFor="acc-email" label="Email">
              <Input id="acc-email" type="email" value={account.email} readOnly className="bg-muted/40" />
            </Field>
            <Field htmlFor="acc-lang" label="Language">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="acc-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field htmlFor="acc-tz" label="Time zone">
              <Select value={tz} onValueChange={setTz}>
                <SelectTrigger id="acc-tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm font-semibold">Change password</p>
          {account.hasPassword ? (
            <form
              ref={pwFormRef}
              onSubmit={(e) => {
                e.preventDefault();
                savePassword();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field htmlFor="pw-current" label="Current">
                  <Input id="pw-current" name="current" type="password" autoComplete="current-password" />
                </Field>
                <Field htmlFor="pw-new" label="New">
                  <Input id="pw-new" name="next" type="password" autoComplete="new-password" />
                </Field>
                <Field htmlFor="pw-confirm" label="Confirm">
                  <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={savingPw}>
                  {savingPw ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              You sign in with a social provider, so there&apos;s no password to change here.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently remove your account and personal data. This can&apos;t be undone.
            </p>
          </div>
          <DangerAction
            label="Delete account"
            title="Delete your account?"
            description="This permanently deletes your account and removes you from all care circles. This cannot be undone."
            onConfirm={async () => {
              const res = await deleteAccount();
              if (!res.ok) return toast.error(res.error);
              // The session is already cleared server-side; hard-navigate home for a clean reset.
              window.location.href = "/";
            }}
          />
        </CardContent>
      </Card>
    </SettingsSection>
  );
}

/* ------------------------------- Care circle ------------------------------ */
export function KintwadiSection() {
  const router = useRouter();
  const [settings, setSettings] = React.useState<CircleSettings | null>(null);
  const [circleName, setCircleName] = React.useState("");
  const [transferTo, setTransferTo] = React.useState("");
  const [saving, startSaving] = React.useTransition();

  React.useEffect(() => {
    let active = true;
    loadCircleSettings().then((res) => {
      if (!active || !res.ok) return;
      setSettings(res.settings);
      setCircleName(res.settings.name);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!settings) {
    return (
      <SettingsSection title="Care circle" description="Settings for this circle.">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </SettingsSection>
    );
  }

  const { canManage, isOwner, members } = settings;

  const save = () =>
    startSaving(async () => {
      const res = await renameCircle(circleName);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSettings((s) => (s ? { ...s, name: circleName } : s));
      toast.success("Circle updated");
      router.refresh();
    });

  const doTransfer = async () => {
    if (!transferTo) return;
    const res = await transferOwnership(transferTo);
    if (!res.ok) return toast.error(res.error);
    toast.success("Ownership transferred");
    router.refresh();
  };

  const doDelete = async () => {
    const res = await deleteCircle();
    if (!res.ok) return toast.error(res.error);
    toast.success("Circle deleted");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <SettingsSection title="Care circle" description="Settings for this circle.">
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <Field htmlFor="circle-name" label="Circle name">
            <Input
              id="circle-name"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              disabled={!canManage}
            />
          </Field>
          <LinkRow
            href="/people"
            icon={HeartPulse}
            title="Care recipient"
            sub={settings.recipientName ? `${settings.recipientName} · view circle` : "View circle"}
          />
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <p className="text-sm font-semibold">Ownership &amp; lifecycle</p>

            {/* Transfer ownership */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Transfer ownership</p>
                <p className="mb-2 text-xs text-muted-foreground">Hand coordinator duties to another member.</p>
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Invite another member first.</p>
                ) : (
                  <Select value={transferTo} onValueChange={setTransferTo}>
                    <SelectTrigger className="sm:max-w-xs" aria-label="Choose a member">
                      <SelectValue placeholder="Choose a member…" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.membershipId} value={m.membershipId}>
                          {m.name} · {m.roleLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ConfirmAction
                trigger={
                  <Button variant="outline" className="sm:shrink-0" disabled={!transferTo}>
                    Transfer
                  </Button>
                }
                title="Transfer ownership?"
                description="The chosen member becomes the coordinator (owner), and you become a family admin. You can ask them to transfer it back later."
                actionLabel="Transfer"
                onConfirm={doTransfer}
              />
            </div>

            {/* Delete circle */}
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">Delete circle</p>
                <p className="text-xs text-muted-foreground">Removes the circle for everyone. This can&apos;t be undone.</p>
              </div>
              <DangerAction
                label="Delete circle"
                title="Delete this care circle?"
                description="This deletes the circle and hides all of its data for every member. This cannot be undone."
                onConfirm={doDelete}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </SettingsSection>
  );
}

/* --------------------------------- Members -------------------------------- */
export function MembersSection() {
  return (
    <SettingsSection title="Members & roles" description="Manage who's in the circle and what they can see.">
      <Card>
        <CardContent className="p-2 sm:p-3">
          <LinkRow href="/people" icon={Users} title="People in this circle" sub="Invite, change roles, suspend or remove" />
        </CardContent>
      </Card>
    </SettingsSection>
  );
}

/* ------------------------------ Health alerts ----------------------------- */
export function HealthAlertsSection() {
  return (
    <SettingsSection title="Health alerts" description="Safe ranges that notify the family when a reading is out of range.">
      <Card>
        <CardContent className="p-2 sm:p-3">
          <LinkRow href="/health/alerts" icon={HeartPulse} title="Alert thresholds" sub="Per-metric min/max and who gets alerted" />
        </CardContent>
      </Card>
    </SettingsSection>
  );
}

/* --------------------------------- Shared --------------------------------- */
function LinkRow({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

/** A confirmation dialog wrapping an arbitrary trigger (neutral action, e.g. transfer). */
function ConfirmAction({
  trigger,
  title,
  description,
  actionLabel,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DangerAction({
  label,
  title,
  description,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:shrink-0">
          <Trash2 className="h-4 w-4" />
          <span className="ml-1">{label}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
