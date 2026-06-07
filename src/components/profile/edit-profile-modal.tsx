"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
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
import { LANGUAGES, PREFERENCES, PROFILE, TIMEZONES } from "./data";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Edit profile — grouped fields in a Dialog (tablet+) / Sheet (phone). */
export function EditProfileModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [values, setValues] = React.useState({
    fullName: PROFILE.fullName,
    dob: PROFILE.dob,
    language: PROFILE.language,
    timezone: PROFILE.timezone,
    bloodType: PROFILE.bloodType,
    mobility: PROFILE.mobility,
    dietary: PROFILE.dietary.join(", "),
    comfort: PREFERENCES.comfort,
  });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || saved) return;
    setSaving(true);
    await delay(650);
    setSaving(false);
    setSaved(true);
    toast.success("Profile updated");
    await delay(500);
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit profile"
      description={`Keep ${PROFILE.name}'s details and care notes up to date.`}
    >
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 sm:px-6">
          <Group title="Basics">
            <FormField htmlFor="ep-name" label="Full name" full>
              <Input id="ep-name" value={values.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            </FormField>
            <FormField htmlFor="ep-dob" label="Date of birth">
              <Input id="ep-dob" value={values.dob} onChange={(e) => set({ dob: e.target.value })} />
            </FormField>
            <FormField htmlFor="ep-lang" label="Primary language">
              <Select value={values.language} onValueChange={(v) => set({ language: v })}>
                <SelectTrigger id="ep-lang"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField htmlFor="ep-tz" label="Time zone" full>
              <Select value={values.timezone} onValueChange={(v) => set({ timezone: v })}>
                <SelectTrigger id="ep-tz"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </Group>

          <Group title="Health">
            <FormField htmlFor="ep-blood" label="Blood type">
              <Input id="ep-blood" value={values.bloodType} onChange={(e) => set({ bloodType: e.target.value })} />
            </FormField>
            <FormField htmlFor="ep-mobility" label="Mobility" full>
              <Input id="ep-mobility" value={values.mobility} onChange={(e) => set({ mobility: e.target.value })} />
            </FormField>
            <FormField htmlFor="ep-dietary" label="Dietary needs" hint="Comma-separated" full>
              <Input id="ep-dietary" value={values.dietary} onChange={(e) => set({ dietary: e.target.value })} />
            </FormField>
          </Group>

          <Group title="Care preferences">
            <FormField htmlFor="ep-comfort" label="Comfort notes" full>
              <Textarea
                id="ep-comfort"
                value={values.comfort}
                onChange={(e) => set({ comfort: e.target.value })}
                rows={4}
                placeholder="The human details that help someone care well…"
              />
            </FormField>
          </Group>
        </div>

        <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || saved}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || saved} className="min-w-[8.5rem]">
              {saved ? (
                <><Check className="h-4 w-4" /><span className="ml-1">Saved</span></>
              ) : saving ? (
                <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /><span className="ml-1">Saving…</span></>
              ) : (
                <span>Save changes</span>
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
