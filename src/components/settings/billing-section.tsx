"use client";

import * as React from "react";
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
import { BILLING_PLANS, billingPlanFor } from "./data";
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
      <SettingsSection title="Billing" description="Your plan, payment methods, and invoices.">
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

  const removeCard = async (id: string) => {
    setBusyId(id);
    const res = await removePaymentMethod(id);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Card removed");
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
    <SettingsSection title="Billing" description="Your plan, payment methods, and invoices.">
      {/* Current plan — the real plan stored on the circle. */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Current plan</p>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="mt-1 text-2xl font-bold">
                {plan.name}{" "}
                {plan.price && (
                  <span className="text-base font-medium text-muted-foreground">
                    {plan.price}
                    {plan.period}
                  </span>
                )}
              </p>
            </div>
          </div>
          {plan.features.length > 0 && (
            <ul className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              {plan.features.map((f) => (
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
                  key={p.name}
                  type="button"
                  onClick={() => !isCurrent && toast("Plan changes aren't available in this preview.")}
                  aria-pressed={isCurrent}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent ? "border-primary bg-primary/5" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    {p.name}
                    {isCurrent && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <p className="mt-1 text-lg font-bold">
                    {p.price}
                    {p.period && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
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
            <span>Payment methods and invoices are managed by your circle&apos;s coordinator.</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Payment methods */}
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Payment methods</p>
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  <span className="ml-1">Add card</span>
                </Button>
              </div>

              {billing.cards.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No payment methods yet. Add a card to keep billing uninterrupted.
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
                We store only your card&apos;s brand, last 4 digits, and expiry — never the full number.
              </p>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className="p-0">
            <CardContent className="p-4 sm:p-6">
              <p className="mb-3 text-sm font-semibold">Invoices</p>
              {billing.invoices.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No invoices yet. They&apos;ll appear here once your plan is billed.
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
                            <span className="ml-1">Download</span>
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <table className="w-full min-w-[34rem] text-sm">
                    <caption className="sr-only">Past invoices</caption>
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th scope="col" className="py-2.5 pr-4 text-left font-medium">Invoice</th>
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">Date</th>
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">Amount</th>
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">Status</th>
                        <th scope="col" className="py-2.5 pl-4 text-right font-medium"><span className="sr-only">Download</span></th>
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
                                  <span className="ml-1">PDF</span>
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
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <CreditCard className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{brandLabel(card.brand)} •••• {card.last4}</span>
          {card.isDefault && <Badge variant="secondary" className="shrink-0">Default</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          Expires {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
        </p>
      </div>
      {!card.isDefault && (
        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={onMakeDefault} disabled={busy}>
          <Star className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Default</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={busy}
        aria-label="Remove card"
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
      toast.error("Enter the expiry as MM/YY.");
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
    toast.success("Card added");
    await onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a payment card</DialogTitle>
          <DialogDescription>We store only the brand, last 4 digits, and expiry — never the full number.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="card-number">Card number</Label>
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
              <Label htmlFor="card-exp">Expiry (MM/YY)</Label>
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
              Set as default
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[7rem]">
              {saving ? "Adding…" : "Add card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
