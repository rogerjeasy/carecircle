"use client";

import * as React from "react";
import { toast } from "sonner";
import { Heart, User, X, Plus, Trash2, Sparkles, Users, Cake, Languages as LanguagesIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "./chip-input";
import { downscaleImage } from "./utils";
import {
  commonAllergies,
  commonConditions,
  inviteRoles,
  languages,
  relationships,
  timezones,
} from "./data";
import type { OnboardingData, StepProps } from "./types";

/* ----------------------------- Step 1: Welcome ---------------------------- */
export function Step1Welcome() {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Heart className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-3">
        <h2 className="font-serif text-3xl font-bold text-foreground">Welcome to Kintwadi</h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          You are about to bring your family and care team together in one place.
        </p>
      </div>
      <div className="pt-4">
        <p className="text-primary font-medium">Let&apos;s set up care for your loved one.</p>
      </div>
    </div>
  );
}

/* ------------------------- Step 2: Care recipient ------------------------- */
export function Step2CareRecipient({ data, updateData }: StepProps) {
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await downscaleImage(file);
        updateData({ recipientPhoto: dataUrl });
      } catch {
        toast.error("Couldn't read that image", { description: "Please try a different photo." });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">Who are you caring for?</h2>
        <p className="text-muted-foreground">Tell us about the person at the center of this care circle.</p>
      </div>

      <div className="space-y-4">
        {/* Photo upload */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className={cn(
                "w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden",
                "hover:border-primary/50 transition-colors cursor-pointer"
              )}
            >
              {data.recipientPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.recipientPhoto} alt="Care recipient" className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground/50" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Upload photo"
              />
            </div>
            {data.recipientPhoto && (
              <button
                type="button"
                onClick={() => updateData({ recipientPhoto: null })}
                className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Add a photo (optional)</p>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="recipientName">Their name *</Label>
          <Input
            id="recipientName"
            placeholder="e.g., Antonio"
            value={data.recipientName}
            onChange={(e) => updateData({ recipientName: e.target.value })}
            autoComplete="off"
          />
        </div>

        {/* Date of birth */}
        <div className="space-y-2">
          <Label htmlFor="recipientDob">Date of birth</Label>
          <Input
            id="recipientDob"
            type="date"
            value={data.recipientDateOfBirth}
            onChange={(e) => updateData({ recipientDateOfBirth: e.target.value })}
          />
        </div>

        {/* Relationship */}
        <div className="space-y-2">
          <Label htmlFor="relationship">Your relationship to them</Label>
          <Select value={data.relationship} onValueChange={(value) => updateData({ relationship: value })}>
            <SelectTrigger id="relationship">
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {relationships.map((rel) => (
                <SelectItem key={rel} value={rel.toLowerCase()}>
                  {rel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Step 3: Health basics -------------------------- */
export function Step3HealthBasics({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">Health basics</h2>
        <p className="text-muted-foreground">
          This helps your care team provide better support. All fields are optional.
        </p>
      </div>

      <div className="space-y-5">
        {/* Conditions */}
        <ChipInput
          label="Key conditions"
          value={data.conditions}
          onChange={(conditions) => updateData({ conditions })}
          suggestions={commonConditions}
          placeholder="Type or select conditions..."
        />

        {/* Allergies */}
        <ChipInput
          label="Allergies"
          value={data.allergies}
          onChange={(allergies) => updateData({ allergies })}
          suggestions={commonAllergies}
          placeholder="Type or select allergies..."
        />

        {/* Primary language */}
        <div className="space-y-2">
          <Label htmlFor="language">Primary language</Label>
          <Select value={data.primaryLanguage} onValueChange={(value) => updateData({ primaryLanguage: value })}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang.toLowerCase()}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Time zone</Label>
          <Select value={data.timezone} onValueChange={(value) => updateData({ timezone: value })}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Step 4: Invite circle -------------------------- */
export function Step4InviteCircle({ data, updateData }: StepProps) {
  const addInvite = () => {
    updateData({ invites: [...data.invites, { email: "", role: "family" }] });
  };

  const updateInvite = (index: number, field: "email" | "role", value: string) => {
    const newInvites = [...data.invites];
    newInvites[index] = { ...newInvites[index], [field]: value };
    updateData({ invites: newInvites });
  };

  const removeInvite = (index: number) => {
    updateData({ invites: data.invites.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">Invite your circle</h2>
        <p className="text-muted-foreground">Add family members, caregivers, or anyone who helps with care.</p>
      </div>

      <div className="space-y-4">
        {data.invites.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">No invites yet. Add people to your care circle.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.invites.map((invite, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border bg-card">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={invite.email}
                    onChange={(e) => updateInvite(index, "email", e.target.value)}
                    aria-label={`Email for invite ${index + 1}`}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={invite.role} onValueChange={(value) => updateInvite(index, "role", value)}>
                    <SelectTrigger className="w-full sm:w-[160px]" aria-label={`Role for invite ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(20rem,calc(100vw-2rem))] sm:min-w-[16rem]">
                      {inviteRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value} description={role.description}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInvite(index)}
                    aria-label="Remove invite"
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" onClick={addInvite} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add another person
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          You can always invite more people later from the dashboard.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Step 5: Done ------------------------------- */
export function Step5Done({ data }: { data: OnboardingData }) {
  const recipientName = data.recipientName || "Your loved one";

  // Map the stored values back to the human-readable labels the user picked. Language is stored
  // lowercased (the Select uses `lang.toLowerCase()` as its value), so re-match case-insensitively;
  // timezone is stored as its IANA value, so look up its friendly label.
  const languageLabel = data.primaryLanguage
    ? languages.find((l) => l.toLowerCase() === data.primaryLanguage.toLowerCase()) ?? data.primaryLanguage
    : null;
  const timezoneLabel = data.timezone
    ? timezones.find((t) => t.value === data.timezone)?.label ?? data.timezone
    : null;
  // DOB is a date-only "YYYY-MM-DD" string; anchor it to local midnight so it doesn't shift a day.
  const dobLabel = data.recipientDateOfBirth
    ? new Date(`${data.recipientDateOfBirth}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="text-center space-y-6 py-6">
      <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-success" />
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-3xl font-bold text-foreground">{recipientName}&apos;s Care Circle is ready!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          You&apos;ve taken the first step toward better coordinated care. Your circle is set up and ready to go.
        </p>
      </div>

      {/* Summary card */}
      <Card className="text-left max-w-sm mx-auto">
        {/* sm:p-4 needed: CardContent's base class sets sm:pt-0 (assumes a CardHeader). */}
        <CardContent className="p-4 sm:p-4 space-y-3">
          <div className="flex items-center gap-3">
            {data.recipientPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.recipientPhoto} alt={recipientName} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold">{recipientName}</p>
              {data.relationship && <p className="text-sm text-muted-foreground capitalize">Your {data.relationship}</p>}
            </div>
          </div>

          {(dobLabel || languageLabel || timezoneLabel) && (
            <div className="space-y-2 pt-2 border-t text-sm">
              {dobLabel && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cake className="h-4 w-4 shrink-0" />
                  <span>{dobLabel}</span>
                </div>
              )}
              {languageLabel && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LanguagesIcon className="h-4 w-4 shrink-0" />
                  <span>{languageLabel}</span>
                </div>
              )}
              {timezoneLabel && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{timezoneLabel}</span>
                </div>
              )}
            </div>
          )}

          {(data.conditions.length > 0 || data.allergies.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {data.conditions.slice(0, 3).map((c) => (
                <Badge key={c} variant="outline" className="text-xs">
                  {c}
                </Badge>
              ))}
              {data.allergies.slice(0, 2).map((a) => (
                <Badge key={a} variant="destructive" className="text-xs bg-destructive/10 text-destructive border-0">
                  {a}
                </Badge>
              ))}
              {data.conditions.length + data.allergies.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{data.conditions.length + data.allergies.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {data.invites.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {data.invites.length} invite{data.invites.length !== 1 ? "s" : ""} pending
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="pt-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          What&apos;s next? Start adding medications, appointments, and daily updates.
        </p>
      </div>
    </div>
  );
}
