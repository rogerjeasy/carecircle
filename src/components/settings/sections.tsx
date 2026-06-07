"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, HeartPulse, Trash2, Users } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { SettingsSection, Field } from "./section";
import { LANGUAGES, TIMEZONES } from "./data";

/* --------------------------------- Account -------------------------------- */
export function AccountSection() {
  const { user } = useAppShell();
  const [name, setName] = React.useState(user?.name ?? "Maria Rodriguez");
  const [email] = React.useState(user?.email ?? "maria@example.com");
  const [language, setLanguage] = React.useState(LANGUAGES[0]);
  const [tz, setTz] = React.useState(TIMEZONES[0]);

  return (
    <SettingsSection title="Account" description="Your personal details and preferences.">
      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user?.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback className="bg-accent/10 text-lg font-semibold text-accent">
                {user?.initials ?? "MR"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <Button variant="outline" size="sm" onClick={() => toast("Choose a new profile photo")}>
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
              <Input id="acc-email" type="email" value={email} readOnly className="bg-muted/40" />
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
            <Button onClick={() => toast.success("Account updated")}>Save changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm font-semibold">Change password</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field htmlFor="pw-current" label="Current">
              <Input id="pw-current" type="password" autoComplete="current-password" />
            </Field>
            <Field htmlFor="pw-new" label="New">
              <Input id="pw-new" type="password" autoComplete="new-password" />
            </Field>
            <Field htmlFor="pw-confirm" label="Confirm">
              <Input id="pw-confirm" type="password" autoComplete="new-password" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => toast.success("Password updated")}>
              Update password
            </Button>
          </div>
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
            onConfirm={() => toast("Account deletion requested")}
          />
        </CardContent>
      </Card>
    </SettingsSection>
  );
}

/* ------------------------------- Care circle ------------------------------ */
export function CareCircleSection() {
  const { role } = useAppShell();
  const isCoordinator = role === "coordinator";
  const [circleName, setCircleName] = React.useState("Antonio's Care Circle");

  return (
    <SettingsSection title="Care circle" description="Settings for this circle.">
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <Field htmlFor="circle-name" label="Circle name">
            <Input
              id="circle-name"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              disabled={!isCoordinator}
            />
          </Field>
          <LinkRow href="/dashboard" icon={HeartPulse} title="Care recipient" sub="Antonio Rodriguez · view profile" />
          {isCoordinator && (
            <div className="flex justify-end">
              <Button onClick={() => toast.success("Circle updated")}>Save changes</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isCoordinator && (
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <p className="text-sm font-semibold">Ownership &amp; lifecycle</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Transfer ownership</p>
                <p className="text-xs text-muted-foreground">Hand coordinator duties to another member.</p>
              </div>
              <Button variant="outline" className="sm:shrink-0" onClick={() => toast("Choose a member to transfer to")}>
                Transfer
              </Button>
            </div>
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">Archive or delete circle</p>
                <p className="text-xs text-muted-foreground">Archiving hides it; deleting removes all data.</p>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <Button variant="outline" onClick={() => toast("Circle archived")}>
                  Archive
                </Button>
                <DangerAction
                  label="Delete circle"
                  title="Delete this care circle?"
                  description="This permanently deletes the circle and all its data for everyone. This cannot be undone."
                  onConfirm={() => toast("Circle deletion requested")}
                />
              </div>
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
