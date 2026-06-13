"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { Field } from "@/components/settings/section";
import { LANGUAGES, TIMEZONES } from "@/components/settings/data";
import {
  loadAccountSettings,
  updateAccountProfile,
  changePassword,
  deleteAccount,
  type AccountSettings,
} from "@/lib/account/actions";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Dedicated "Your profile" page screen — the signed-in user edits their OWN account:
 * photo, name, language, time zone, password, and account deletion. Every read/mutation goes
 * through the real, session-pinned server actions in src/lib/account/actions.ts (no client
 * trust, no placeholder data).
 */
export function AccountScreen() {
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
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Your profile</h1>
          <p className="mt-1 text-muted-foreground">Update your personal details, photo and sign-in security.</p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarSrc = photoDataUrl ?? account.image ?? undefined;
  const dirty = name !== account.name || language !== account.language || tz !== account.timezone || Boolean(photoDataUrl);

  const onPickPhoto = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose an image under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter your name.");
      return;
    }
    const fd = new FormData();
    fd.set("name", trimmed);
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
      setAccount((a) => (a ? { ...a, name: trimmed, language, timezone: tz, image: res.image } : a));
      setName(trimmed);
      setPhotoDataUrl(null);
      // Reflect a new photo in the sidebar/nav immediately (only when it actually changed).
      if (changedPhoto) setUserImage(res.image);
      toast.success("Profile updated");
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Your profile</h1>
        <p className="mt-1 text-muted-foreground">Update your personal details, photo and sign-in security.</p>
      </div>

      {/* Profile details */}
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
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field htmlFor="acc-email" label="Email" hint="Your email is used to sign in and can't be changed here.">
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
            <Button onClick={saveProfile} disabled={savingProfile || !dirty}>
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
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with an uppercase letter, a lowercase letter and a number.
              </p>
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                <span className="ml-1">Delete account</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account and removes you from all care circles. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const res = await deleteAccount();
                    if (!res.ok) return toast.error(res.error);
                    // The session is already cleared server-side; hard-navigate home for a clean reset.
                    window.location.href = "/";
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
