"use client";

import { toast } from "sonner";
import { CreditCard, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsSection } from "./section";
import { useIsPhone } from "./use-is-phone";
import { CURRENT_PLAN, INVOICES, PLANS } from "./data";

export function BillingSection() {
  const isPhone = useIsPhone();

  return (
    <SettingsSection title="Billing" description="Your plan, payment method, and invoices.">
      {/* Current plan */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Current plan</p>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="mt-1 text-2xl font-bold">
                {CURRENT_PLAN.name}{" "}
                <span className="text-base font-medium text-muted-foreground">
                  {CURRENT_PLAN.price}
                  {CURRENT_PLAN.period}
                </span>
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {CURRENT_PLAN.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PLANS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => !p.current && toast.success(`Switched to the ${p.name} plan`)}
                aria-pressed={p.current}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  p.current ? "border-primary bg-primary/5" : "hover:bg-muted"
                )}
              >
                <p className="flex items-center justify-between text-sm font-semibold">
                  {p.name}
                  {p.current && <Badge variant="secondary">Current</Badge>}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {p.price}
                  <span className="text-xs font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground">{p.note}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Visa ending 4242</p>
              <p className="text-xs text-muted-foreground">Expires 08/27</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast("Update payment method")}>
            Update
          </Button>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="p-0">
        <CardContent className="p-4 sm:p-6">
          <p className="mb-3 text-sm font-semibold">Invoices</p>
          {isPhone ? (
            <ul className="space-y-2">
              {INVOICES.map((inv) => (
                <li key={inv.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{inv.amount}</span>
                    <Badge variant="success">{inv.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{inv.id} · {inv.date}</p>
                  <Button variant="ghost" size="sm" className="mt-1 h-8 px-2 text-xs" onClick={() => toast("Downloading invoice")}>
                    <Download className="h-3.5 w-3.5" />
                    <span className="ml-1">Download</span>
                  </Button>
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
                    <th scope="col" className="py-2.5 pl-4 text-right font-medium">
                      <span className="sr-only">Download</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {INVOICES.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium tabular-nums">{inv.id}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.date}</td>
                      <td className="px-4 py-3 tabular-nums">{inv.amount}</td>
                      <td className="px-4 py-3">
                        <Badge variant="success">{inv.status}</Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => toast("Downloading invoice")}>
                          <Download className="h-3.5 w-3.5" />
                          <span className="ml-1">PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
