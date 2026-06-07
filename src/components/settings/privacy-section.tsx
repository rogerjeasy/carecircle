"use client";

import { toast } from "sonner";
import { Download, Laptop, Lock, Monitor, Smartphone } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsSection } from "./section";
import { AuditLog } from "./audit-log";
import { SESSIONS } from "./data";

export function PrivacySecuritySection() {
  const { role } = useAppShell();
  const canSeeAudit = role === "coordinator" || role === "family";

  return (
    <SettingsSection title="Privacy & security" description="Sessions, the audit log, and your data.">
      {/* Sessions */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Active sessions</p>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toast("Signed out of other devices")}>
              Sign out all others
            </Button>
          </div>
          <ul className="space-y-2">
            {SESSIONS.map((s) => {
              const Icon = s.device.includes("iPhone") ? Smartphone : s.device.includes("iPad") ? Monitor : Laptop;
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      <span className="truncate">{s.device}</span>
                      {s.current && <Badge variant="success" className="shrink-0">This device</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{s.location} · {s.lastActive}</p>
                  </div>
                  {!s.current && (
                    <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => toast("Session revoked")}>
                      Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <p className="text-sm font-semibold">Audit log</p>
          {canSeeAudit ? (
            <AuditLog />
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>The audit log is available to coordinators and family admins.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data export */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Export your data</p>
            <p className="text-xs text-muted-foreground">Download a copy of this circle&apos;s care record.</p>
          </div>
          <Button variant="outline" onClick={() => toast.success("Preparing your export — we'll email a link")}>
            <Download className="h-4 w-4" />
            <span className="ml-1">Export data</span>
          </Button>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
