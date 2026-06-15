"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TOPIC_VALUES, type TopicValue } from "./data";
import { submitContactMessage } from "@/lib/contact/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Values {
  name: string;
  email: string;
  topic: TopicValue;
  message: string;
}

// Errors hold a message KEY into `contact.form.errors`, resolved to text at render time.
type ErrorKey = "name" | "emailRequired" | "emailInvalid" | "message";
type Errors = Partial<Record<keyof Values, ErrorKey>>;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "name";
  if (!v.email.trim()) e.email = "emailRequired";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "emailInvalid";
  if (v.message.trim().length < 10) e.message = "message";
  return e;
}

export function ContactForm() {
  const t = useTranslations("contact.form");
  const [values, setValues] = React.useState<Values>({ name: "", email: "", topic: "general", message: "" });
  const [touched, setTouched] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const errors = validate(values);
  const valid = Object.keys(errors).length === 0;
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));
  const errKey = (k: keyof Values) => (touched ? errors[k] : undefined);
  const errText = (k: keyof Values) => {
    const key = errKey(k);
    return key ? t(`errors.${key}`) : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("email", values.email);
    fd.set("topic", values.topic);
    fd.set("message", values.message);
    const res = await submitContactMessage(fd);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success motion-safe:animate-in motion-safe:zoom-in-50">
            <Check className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {t("success.title", { name: values.name.split(" ")[0] || t("success.fallbackName") })}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {t.rich("success.body", {
                email: () => <span className="font-medium text-foreground">{values.email}</span>,
              })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setValues({ name: "", email: "", topic: "general", message: "" });
              setTouched(false);
              setDone(false);
            }}
          >
            {t("success.another")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field htmlFor="c-name" label={t("name")} error={errText("name")} required>
              <Input
                id="c-name"
                value={values.name}
                onChange={(e) => set({ name: e.target.value })}
                onBlur={() => setTouched(true)}
                autoComplete="name"
                aria-invalid={errKey("name") ? true : undefined}
                className={cn(errKey("name") && "border-destructive focus-visible:ring-destructive")}
              />
            </Field>
            <Field htmlFor="c-email" label={t("email")} error={errText("email")} required>
              <Input
                id="c-email"
                type="email"
                inputMode="email"
                value={values.email}
                onChange={(e) => set({ email: e.target.value })}
                onBlur={() => setTouched(true)}
                autoComplete="email"
                aria-invalid={errKey("email") ? true : undefined}
                className={cn(errKey("email") && "border-destructive focus-visible:ring-destructive")}
              />
            </Field>
          </div>

          <Field htmlFor="c-topic" label={t("topic")}>
            <Select value={values.topic} onValueChange={(v) => set({ topic: v as TopicValue })}>
              <SelectTrigger id="c-topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPIC_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`topics.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field htmlFor="c-message" label={t("message")} error={errText("message")} required>
            <Textarea
              id="c-message"
              value={values.message}
              onChange={(e) => set({ message: e.target.value })}
              onBlur={() => setTouched(true)}
              rows={5}
              placeholder={t("messagePlaceholder")}
              aria-invalid={errKey("message") ? true : undefined}
              className={cn(errKey("message") && "border-destructive focus-visible:ring-destructive")}
            />
          </Field>

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>
            <Button type="submit" disabled={submitting || (touched && !valid)} className="min-w-[9.5rem]">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  <span className="ml-1">{t("sending")}</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="ml-1">{t("send")}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  htmlFor,
  label,
  error,
  required,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
