"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Laptop, Lock } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsSection } from "./section";
import { AuditLog } from "./audit-log";
import { requestDataExport } from "@/lib/settings/audit";

export function PrivacySecuritySection() {
  const { role, signOut } = useAppShell();
  // The circle audit_log SELECT policy limits reads to owner/family_admin → the UI "coordinator".
  const canSeeAudit = role === "coordinator";
  const [exporting, startExport] = React.useTransition();

  const onExport = () =>
    startExport(async () => {
      const res = await requestDataExport();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Export requested — we'll email you a link when it's ready.");
    });

  return (
    <SettingsSection title="Privacy & security" description="Your session, the audit log, and your data.">
      {/* Session — JWT auth: we show the current device + a real sign-out (there's no server-side
          list of other devices to revoke). */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <p className="text-sm font-semibold">This session</p>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Laptop className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 truncate text-sm font-medium">
                <span className="truncate">This device</span>
                <Badge variant="success" className="shrink-0">Signed in</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">You&apos;re currently signed in here.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
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
              <span>The audit log is available to coordinators.</span>
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
          <Button variant="outline" onClick={onExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            <span className="ml-1">{exporting ? "Requesting…" : "Export data"}</span>
          </Button>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
