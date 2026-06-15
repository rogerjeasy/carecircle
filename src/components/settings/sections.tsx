"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings.account");
  const tc = useTranslations("settings.common");
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
      <SettingsSection title={t("title")} description={t("description")}>
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
      toast.error(t("photoTooLarge"));
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
      toast.success(t("updated"));
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
      toast.success(t("passwordUpdated"));
    });
  };

  return (
    <SettingsSection title={t("title")} description={t("description")}>
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
                {t("changePhoto")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field htmlFor="acc-name" label={t("fullName")}>
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field htmlFor="acc-email" label={t("email")}>
              <Input id="acc-email" type="email" value={account.email} readOnly className="bg-muted/40" />
            </Field>
            <Field htmlFor="acc-lang" label={t("language")}>
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
            <Field htmlFor="acc-tz" label={t("timezone")}>
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
              {savingProfile ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm font-semibold">{t("changePassword")}</p>
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
                <Field htmlFor="pw-current" label={t("current")}>
                  <Input id="pw-current" name="current" type="password" autoComplete="current-password" />
                </Field>
                <Field htmlFor="pw-new" label={t("new")}>
                  <Input id="pw-new" name="next" type="password" autoComplete="new-password" />
                </Field>
                <Field htmlFor="pw-confirm" label={t("confirm")}>
                  <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={savingPw}>
                  {savingPw ? t("updating") : t("updatePassword")}
                </Button>
              </div>
            </form>
          ) : (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {t("socialNoPassword")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">{t("deleteAccount")}</p>
            <p className="text-xs text-muted-foreground">
              {t("deleteAccountDesc")}
            </p>
          </div>
          <DangerAction
            label={t("deleteAccount")}
            title={t("deleteAccountTitle")}
            description={t("deleteAccountConfirm")}
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
  const t = useTranslations("settings.circle");
  const tc = useTranslations("settings.common");
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
      <SettingsSection title={t("title")} description={t("description")}>
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
      toast.success(t("updated"));
      router.refresh();
    });

  const doTransfer = async () => {
    if (!transferTo) return;
    const res = await transferOwnership(transferTo);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("transferred"));
    router.refresh();
  };

  const doDelete = async () => {
    const res = await deleteCircle();
    if (!res.ok) return toast.error(res.error);
    toast.success(t("deleted"));
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <Field htmlFor="circle-name" label={t("name")}>
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
            title={t("recipientTitle")}
            sub={settings.recipientName ? t("recipientViewNamed", { name: settings.recipientName }) : t("recipientView")}
          />
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? tc("saving") : tc("saveChanges")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <p className="text-sm font-semibold">{t("ownership")}</p>

            {/* Transfer ownership */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t("transfer")}</p>
                <p className="mb-2 text-xs text-muted-foreground">{t("transferDesc")}</p>
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("inviteFirst")}</p>
                ) : (
                  <Select value={transferTo} onValueChange={setTransferTo}>
                    <SelectTrigger className="sm:max-w-xs" aria-label={t("chooseMemberAria")}>
                      <SelectValue placeholder={t("chooseMember")} />
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
                    {t("transferBtn")}
                  </Button>
                }
                title={t("transferTitle")}
                description={t("transferConfirmDesc")}
                actionLabel={t("transferBtn")}
                onConfirm={doTransfer}
              />
            </div>

            {/* Delete circle */}
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">{t("deleteCircle")}</p>
                <p className="text-xs text-muted-foreground">{t("deleteCircleDesc")}</p>
              </div>
              <DangerAction
                label={t("deleteCircle")}
                title={t("deleteCircleTitle")}
                description={t("deleteCircleConfirm")}
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
  const t = useTranslations("settings.members");
  return (
    <SettingsSection title={t("title")} description={t("description")}>
      <Card>
        <CardContent className="p-2 sm:p-3">
          <LinkRow href="/people" icon={Users} title={t("linkTitle")} sub={t("linkSub")} />
        </CardContent>
      </Card>
    </SettingsSection>
  );
}

/* ------------------------------ Health alerts ----------------------------- */
export function HealthAlertsSection() {
  const t = useTranslations("settings.healthAlerts");
  return (
    <SettingsSection title={t("title")} description={t("description")}>
      <Card>
        <CardContent className="p-2 sm:p-3">
          <LinkRow href="/health/alerts" icon={HeartPulse} title={t("linkTitle")} sub={t("linkSub")} />
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
  const tc = useTranslations("settings.common");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
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
  const tc = useTranslations("settings.common");
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
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
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
