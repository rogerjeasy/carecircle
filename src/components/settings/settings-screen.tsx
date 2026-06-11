"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AccountSection, KintwadiSection, MembersSection, HealthAlertsSection } from "./sections";
import { NotificationsSettingsSection } from "./notifications-section";
import { BillingSection } from "./billing-section";
import { PrivacySecuritySection } from "./privacy-section";
import { SECTIONS, type SectionId } from "./data";

const RENDERERS: Record<SectionId, React.ComponentType> = {
  account: AccountSection,
  "care-circle": KintwadiSection,
  members: MembersSection,
  notifications: NotificationsSettingsSection,
  "health-alerts": HealthAlertsSection,
  billing: BillingSection,
  privacy: PrivacySecuritySection,
};

/** The Settings area: a real two-pane layout (sub-nav + content) on tablet+, tab strip on phone. */
export function SettingsScreen() {
  const [active, setActive] = React.useState<SectionId>("account");
  const Active = RENDERERS[active];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account, this circle, and how Kintwadi works for you.</p>
      </div>

      {/* Phone: scrollable tab strip */}
      <div className="-mx-4 overflow-x-auto px-4 sm:hidden [scrollbar-width:none]">
        <div className="flex w-max gap-2 pb-1" role="tablist" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active === s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tablet+: two-pane */}
      <div className="sm:grid sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav className="hidden sm:block" aria-label="Settings sections">
          <ul className="sticky top-20 space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-current={active === s.id ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active === s.id ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <s.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <Active />
        </div>
      </div>
    </div>
  );
}
