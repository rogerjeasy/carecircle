"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreditCard, Download, Lock, Plus, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsPhone } from "./use-is-phone";
import { SettingsSection } from "./section";
import { BILLING_PLANS, billingPlanFor, KNOWN_PLAN_IDS } from "./data";
import {
  loadBilling,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  type BillingData,
  type PaymentMethodDTO,
} from "@/lib/billing/actions";

function brandLabel(brand: string): string {
  if (brand === "amex") return "Amex";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function BillingSection() {
  const t = useTranslations("settings.billing");
  const isPhone = useIsPhone();
  const [billing, setBilling] = React.useState<BillingData | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    const res = await loadBilling();
    if (res.ok) setBilling(res.billing);
  }, []);

  React.useEffect(() => {
    let active = true;
    loadBilling().then((res) => {
      if (active && res.ok) setBilling(res.billing);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!billing) {
    return (
      <SettingsSection title={t("title")} description={t("description")}>
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </SettingsSection>
    );
  }

  const plan = billingPlanFor(billing.plan);
  // Known plans pull name/features from messages; unknown ids render plainly with no feature list.
  const planKnown = KNOWN_PLAN_IDS.has(plan.id);
  const planName = planKnown ? t(`plans.${plan.id}.name` as "plans.free.name") : plan.id;
  const planFeatures = planKnown ? (t.raw(`plans.${plan.id}.features` as "plans.free.features") as string[]) : [];

  const removeCard = async (id: string) => {
    setBusyId(id);
    const res = await removePaymentMethod(id);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("cardRemoved"));
    void reload();
  };

  const makeDefault = async (id: string) => {
    setBusyId(id);
    const res = await setDefaultPaymentMethod(id);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    void reload();
  };

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {/* Current plan — the real plan stored on the circle. */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{t("currentPlan")}</p>
                <Badge variant="success">{t("active")}</Badge>
              </div>
              <p className="mt-1 text-2xl font-bold">
                {planName}{" "}
                {plan.price && (
                  <span className="text-base font-medium text-muted-foreground">
                    {plan.price}
                    {plan.period}
                  </span>
                )}
              </p>
            </div>
          </div>
          {planFeatures.length > 0 && (
            <ul className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              {planFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BILLING_PLANS.map((p) => {
              const isCurrent = plan.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !isCurrent && toast(t("planChangeUnavailable"))}
                  aria-pressed={isCurrent}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent ? "border-primary bg-primary/5" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    {t(`plans.${p.id}.name` as "plans.free.name")}
                    {isCurrent && <Badge variant="secondary">{t("current")}</Badge>}
                  </div>
                  <p className="mt-1 text-lg font-bold">
                    {p.price}
                    {p.period && <span className="text-xs font-normal text-muted-foreground">{t("perMonth")}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(`plans.${p.id}.note` as "plans.free.note")}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!billing.canManage ? (
        <Card>
          <CardContent className="flex items-start gap-2 p-4 text-sm text-muted-foreground sm:p-6">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("coordinatorManaged")}</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Payment methods */}
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("paymentMethods")}</p>
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  <span className="ml-1">{t("addCard")}</span>
                </Button>
              </div>

              {billing.cards.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("noCards")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {billing.cards.map((c) => (
                    <PaymentRow
                      key={c.id}
                      card={c}
                      busy={busyId === c.id}
                      onRemove={() => removeCard(c.id)}
                      onMakeDefault={() => makeDefault(c.id)}
                    />
                  ))}
                </ul>
              )}
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {t("cardSecurityNote")}
              </p>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className="p-0">
            <CardContent className="p-4 sm:p-6">
              <p className="mb-3 text-sm font-semibold">{t("invoices")}</p>
              {billing.invoices.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("noInvoices")}
                </p>
              ) : isPhone ? (
                <ul className="space-y-2">
                  {billing.invoices.map((inv) => (
                    <li key={inv.id} className="rounded-xl border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{inv.amount}</span>
                        <Badge variant={inv.status === "paid" ? "success" : "secondary"} className="capitalize">{inv.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{inv.number} · {inv.date}</p>
                      {inv.pdfUrl && (
                        <Button asChild variant="ghost" size="sm" className="mt-1 h-8 px-2 text-xs">
                          <a href={inv.pdfUrl} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            <span className="ml-1">{t("download")}</span>
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <table className="w-full min-w-[34rem] text-sm">
                    <caption className="sr-only">{t("captionInvoices")}</caption>
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th scope="col" className="py-2.5 pr-4 text-left font-medium">{t("invoiceCol")}</th>
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">{t("dateCol")}</th>
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">{t("amountCol")}</th>
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">{t("statusCol")}</th>
                        <th scope="col" className="py-2.5 pl-4 text-right font-medium"><span className="sr-only">{t("download")}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.invoices.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium tabular-nums">{inv.number}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.date}</td>
                          <td className="px-4 py-3 tabular-nums">{inv.amount}</td>
                          <td className="px-4 py-3"><Badge variant={inv.status === "paid" ? "success" : "secondary"} className="capitalize">{inv.status}</Badge></td>
                          <td className="py-3 pl-4 text-right">
                            {inv.pdfUrl ? (
                              <Button asChild variant="ghost" size="sm" className="h-8">
                                <a href={inv.pdfUrl} target="_blank" rel="noreferrer">
                                  <Download className="h-3.5 w-3.5" />
                                  <span className="ml-1">{t("pdf")}</span>
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mounted only while open so each open starts with a fresh, empty form. */}
          {addOpen && <AddCardDialog onOpenChange={setAddOpen} onAdded={reload} />}
        </>
      )}
    </SettingsSection>
  );
}

function PaymentRow({
  card,
  busy,
  onRemove,
  onMakeDefault,
}: {
  card: PaymentMethodDTO;
  busy: boolean;
  onRemove: () => void;
  onMakeDefault: () => void;
}) {
  const t = useTranslations("settings.billing");
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <CreditCard className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{brandLabel(card.brand)} •••• {card.last4}</span>
          {card.isDefault && <Badge variant="secondary" className="shrink-0">{t("defaultBadge")}</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("expires", { date: `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}` })}
        </p>
      </div>
      {!card.isDefault && (
        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={onMakeDefault} disabled={busy}>
          <Star className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">{t("makeDefault")}</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={busy}
        aria-label={t("removeCard")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function AddCardDialog({
  onOpenChange,
  onAdded,
}: {
  onOpenChange: (o: boolean) => void;
  onAdded: () => Promise<void>;
}) {
  const t = useTranslations("settings.billing");
  const [number, setNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [makeDefault, setMakeDefault] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const onExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = number.replace(/\D/g, "");
    const [mm, yy] = expiry.split("/");
    if (!mm || !yy || yy.length < 2) {
      toast.error(t("expiryError"));
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("number", digits);
    fd.set("expMonth", String(Number(mm)));
    fd.set("expYear", String(2000 + Number(yy)));
    fd.set("makeDefault", String(makeDefault));
    const res = await addPaymentMethod(fd);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("cardAdded"));
    await onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addDialogTitle")}</DialogTitle>
          <DialogDescription>{t("addDialogDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="card-number">{t("cardNumber")}</Label>
            <Input
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="card-exp">{t("expiry")}</Label>
              <Input
                id="card-exp"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="08/27"
                value={expiry}
                onChange={(e) => onExpiryChange(e.target.value)}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm" htmlFor="card-default">
              <input
                id="card-default"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
              />
              {t("setDefault")}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[7rem]">
              {saving ? t("adding") : t("addCard")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
