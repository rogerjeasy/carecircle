"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
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
  commonAllergyKeys,
  commonConditionKeys,
  inviteRoles,
  languages,
  relationships,
  timezones,
} from "./data";
import type { OnboardingData, StepProps } from "./types";

/* ----------------------------- Step 1: Welcome ---------------------------- */
export function Step1Welcome() {
  const t = useTranslations("onboarding");
  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Heart className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-3">
        <h2 className="font-serif text-3xl font-bold text-foreground">{t("welcome.title")}</h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">{t("welcome.subtitle")}</p>
      </div>
      <div className="pt-4">
        <p className="text-primary font-medium">{t("welcome.cta")}</p>
      </div>
    </div>
  );
}

/* ------------------------- Step 2: Care recipient ------------------------- */
export function Step2CareRecipient({ data, updateData }: StepProps) {
  const t = useTranslations("onboarding");
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await downscaleImage(file);
        updateData({ recipientPhoto: dataUrl });
      } catch {
        toast.error(t("recipient.photoError"), { description: t("recipient.photoErrorHint") });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">{t("recipient.title")}</h2>
        <p className="text-muted-foreground">{t("recipient.subtitle")}</p>
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
                <img src={data.recipientPhoto} alt={t("recipient.photoAlt")} className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground/50" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label={t("recipient.uploadPhoto")}
              />
            </div>
            {data.recipientPhoto && (
              <button
                type="button"
                onClick={() => updateData({ recipientPhoto: null })}
                className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                aria-label={t("recipient.removePhoto")}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">{t("recipient.addPhotoOptional")}</p>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="recipientName">{t("recipient.nameLabel")}</Label>
          <Input
            id="recipientName"
            placeholder={t("recipient.namePlaceholder")}
            value={data.recipientName}
            onChange={(e) => updateData({ recipientName: e.target.value })}
            autoComplete="off"
          />
        </div>

        {/* Date of birth */}
        <div className="space-y-2">
          <Label htmlFor="recipientDob">{t("recipient.dobLabel")}</Label>
          <Input
            id="recipientDob"
            type="date"
            value={data.recipientDateOfBirth}
            onChange={(e) => updateData({ recipientDateOfBirth: e.target.value })}
          />
        </div>

        {/* Relationship */}
        <div className="space-y-2">
          <Label htmlFor="relationship">{t("recipient.relationshipLabel")}</Label>
          <Select value={data.relationship} onValueChange={(value) => updateData({ relationship: value })}>
            <SelectTrigger id="relationship">
              <SelectValue placeholder={t("recipient.relationshipPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {relationships.map((rel) => (
                <SelectItem key={rel.value} value={rel.value}>
                  {t(`relationships.${rel.key}` as "relationships.parent")}
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
  const t = useTranslations("onboarding");
  // Resolve the suggestion labels for the locale. The chip the user picks is stored as the
  // localized label string (free-text health data they curate), so the dropdown surfaces the
  // translated option text directly.
  const conditionSuggestions = React.useMemo(
    () => commonConditionKeys.map((k) => t(`conditions.${k}` as "conditions.diabetes")),
    [t],
  );
  const allergySuggestions = React.useMemo(
    () => commonAllergyKeys.map((k) => t(`allergies.${k}` as "allergies.penicillin")),
    [t],
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">{t("health.title")}</h2>
        <p className="text-muted-foreground">{t("health.subtitle")}</p>
      </div>

      <div className="space-y-5">
        {/* Conditions */}
        <ChipInput
          label={t("health.conditionsLabel")}
          value={data.conditions}
          onChange={(conditions) => updateData({ conditions })}
          suggestions={conditionSuggestions}
          placeholder={t("health.conditionsPlaceholder")}
        />

        {/* Allergies */}
        <ChipInput
          label={t("health.allergiesLabel")}
          value={data.allergies}
          onChange={(allergies) => updateData({ allergies })}
          suggestions={allergySuggestions}
          placeholder={t("health.allergiesPlaceholder")}
        />

        {/* Primary language */}
        <div className="space-y-2">
          <Label htmlFor="language">{t("health.languageLabel")}</Label>
          <Select value={data.primaryLanguage} onValueChange={(value) => updateData({ primaryLanguage: value })}>
            <SelectTrigger id="language">
              <SelectValue placeholder={t("health.languagePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {t(`languages.${lang.key}` as "languages.english")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">{t("health.timezoneLabel")}</Label>
          <Select value={data.timezone} onValueChange={(value) => updateData({ timezone: value })}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder={t("health.timezonePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {t(`timezones.${tz.key}` as "timezones.easternTime")}
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
  const t = useTranslations("onboarding");
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
        <h2 className="font-serif text-2xl font-bold">{t("invite.title")}</h2>
        <p className="text-muted-foreground">{t("invite.subtitle")}</p>
      </div>

      <div className="space-y-4">
        {data.invites.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">{t("invite.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.invites.map((invite, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border bg-card">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder={t("invite.emailPlaceholder")}
                    value={invite.email}
                    onChange={(e) => updateInvite(index, "email", e.target.value)}
                    aria-label={t("invite.emailAria", { index: index + 1 })}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={invite.role} onValueChange={(value) => updateInvite(index, "role", value)}>
                    <SelectTrigger className="w-full sm:w-[160px]" aria-label={t("invite.roleAria", { index: index + 1 })}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(20rem,calc(100vw-2rem))] sm:min-w-[16rem]">
                      {inviteRoles.map((role) => (
                        <SelectItem
                          key={role.value}
                          value={role.value}
                          description={t(`roles.${role.value}.description` as "roles.family.description")}
                        >
                          {t(`roles.${role.value}.label` as "roles.family.label")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInvite(index)}
                    aria-label={t("invite.removeInvite")}
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
          {t("invite.addPerson")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">{t("invite.laterHint")}</p>
      </div>
    </div>
  );
}

/* ----------------------------- Step 5: Done ------------------------------- */
export function Step5Done({ data }: { data: OnboardingData }) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const recipientName = data.recipientName || t("done.fallbackName");

  // Map the stored values back to the localized labels the user picked. Language is stored
  // lowercased (the Select uses the option's lowercased `value`), so re-match case-insensitively
  // and resolve via the message key; timezone is stored as its IANA value, so look up its key.
  const languageEntry = data.primaryLanguage
    ? languages.find((l) => l.value === data.primaryLanguage.toLowerCase())
    : undefined;
  const languageLabel = languageEntry
    ? t(`languages.${languageEntry.key}` as "languages.english")
    : data.primaryLanguage || null;
  const timezoneEntry = data.timezone ? timezones.find((tz) => tz.value === data.timezone) : undefined;
  const timezoneLabel = timezoneEntry
    ? t(`timezones.${timezoneEntry.key}` as "timezones.easternTime")
    : data.timezone || null;
  const relationshipEntry = data.relationship
    ? relationships.find((r) => r.value === data.relationship.toLowerCase())
    : undefined;
  const relationshipLabel = relationshipEntry
    ? t(`relationships.${relationshipEntry.key}` as "relationships.parent")
    : data.relationship || null;
  // DOB is a date-only "YYYY-MM-DD" string; anchor it to local midnight so it doesn't shift a day.
  const dobLabel = data.recipientDateOfBirth
    ? new Date(`${data.recipientDateOfBirth}T00:00:00`).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const extraCount = data.conditions.length + data.allergies.length - 5;

  return (
    <div className="text-center space-y-6 py-6">
      <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-success" />
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-3xl font-bold text-foreground">{t("done.title", { name: recipientName })}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{t("done.subtitle")}</p>
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
              {relationshipLabel && (
                <p className="text-sm text-muted-foreground">{t("done.relationship", { relationship: relationshipLabel })}</p>
              )}
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
              {extraCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {t("done.moreTags", { count: extraCount })}
                </Badge>
              )}
            </div>
          )}

          {data.invites.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{t("done.invitesPending", { count: data.invites.length })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="pt-4 space-y-2">
        <p className="text-sm text-muted-foreground">{t("done.whatsNext")}</p>
      </div>
    </div>
  );
}
