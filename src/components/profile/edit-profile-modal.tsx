"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveModal } from "./responsive-modal";
import { FormField } from "./form-field";
import { LANGUAGES } from "./data";
import { updateRecipientProfile } from "@/lib/profile/actions";
import type { RecipientProfileData } from "@/lib/profile/queries";

/** Edit the care recipient's profile — wired to the real update action. */
export function EditProfileModal({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: RecipientProfileData;
  onSaved?: () => void;
}) {
  const t = useTranslations("profile");
  const [values, setValues] = React.useState({
    fullName: profile.fullName,
    dob: profile.dobInput ?? "",
    language: profile.language ?? LANGUAGES[0],
    bloodType: profile.bloodType ?? "",
    mobility: profile.mobility ?? "",
    dietary: profile.dietary.join(", "),
    comfort: profile.comfort ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("fullName", values.fullName);
    fd.set("dob", values.dob);
    fd.set("language", values.language);
    fd.set("bloodType", values.bloodType);
    fd.set("mobility", values.mobility);
    fd.set("dietary", values.dietary);
    fd.set("comfort", values.comfort);
    const res = await updateRecipientProfile(fd);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("modal.saved"));
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("modal.title")}
      description={t("modal.description", { name: profile.fullName })}
    >
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 sm:px-6">
          <Group title={t("modal.groups.basics")}>
            <FormField htmlFor="ep-name" label={t("modal.fullName")} full>
              <Input id="ep-name" value={values.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            </FormField>
            <FormField htmlFor="ep-dob" label={t("modal.dob")}>
              <Input id="ep-dob" type="date" value={values.dob} onChange={(e) => set({ dob: e.target.value })} />
            </FormField>
            <FormField htmlFor="ep-lang" label={t("modal.language")}>
              <Select value={values.language} onValueChange={(v) => set({ language: v })}>
                <SelectTrigger id="ep-lang"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </Group>

          <Group title={t("modal.groups.health")}>
            <FormField htmlFor="ep-blood" label={t("modal.bloodType")}>
              <Input id="ep-blood" value={values.bloodType} onChange={(e) => set({ bloodType: e.target.value })} placeholder={t("modal.bloodTypePlaceholder")} />
            </FormField>
            <FormField htmlFor="ep-mobility" label={t("modal.mobility")} full>
              <Input id="ep-mobility" value={values.mobility} onChange={(e) => set({ mobility: e.target.value })} />
            </FormField>
            <FormField htmlFor="ep-dietary" label={t("modal.dietary")} hint={t("modal.dietaryHint")} full>
              <Input id="ep-dietary" value={values.dietary} onChange={(e) => set({ dietary: e.target.value })} />
            </FormField>
          </Group>

          <Group title={t("modal.groups.preferences")}>
            <FormField htmlFor="ep-comfort" label={t("modal.comfort")} full>
              <Textarea
                id="ep-comfort"
                value={values.comfort}
                onChange={(e) => set({ comfort: e.target.value })}
                rows={4}
                placeholder={t("modal.comfortPlaceholder")}
              />
            </FormField>
          </Group>
        </div>

        <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("modal.cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[8.5rem]">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /><span className="ml-1">{t("modal.saving")}</span></>
              ) : (
                <span>{t("modal.save")}</span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </ResponsiveModal>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
