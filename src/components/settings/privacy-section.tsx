"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings.privacy");
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
      toast.success(t("exportRequested"));
    });

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {/* Session — JWT auth: we show the current device + a real sign-out (there's no server-side
          list of other devices to revoke). */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <p className="text-sm font-semibold">{t("thisSession")}</p>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Laptop className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 truncate text-sm font-medium">
                <span className="truncate">{t("thisDevice")}</span>
                <Badge variant="success" className="shrink-0">{t("signedIn")}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">{t("signedInHere")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => void signOut()}
            >
              {t("signOut")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <p className="text-sm font-semibold">{t("auditLog")}</p>
          {canSeeAudit ? (
            <AuditLog />
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t("auditCoordinatorsOnly")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data export */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("exportTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("exportDesc")}</p>
          </div>
          <Button variant="outline" onClick={onExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            <span className="ml-1">{exporting ? t("requesting") : t("export")}</span>
          </Button>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
