"use client";

/**
 * The user-facing outage notice — a slim warning strip at the top of the app content whenever a
 * platform service is down (per the `service_status` snapshot, server-seeded through the
 * app-shell context). Names the affected features in user language and reassures that the team
 * is on it. Dismissible for the session; reappears on the next full load if still down.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppShell } from "./app-shell-context";

// Probed service display name (/admin/system) → message slug under app.status.services.
// The probe names are stable identifiers; the family-facing description is localized.
const SERVICE_SLUG: Record<string, string> = {
  "API / Server Actions": "api",
  "Aurora PostgreSQL": "db",
  "Amazon Bedrock (Claude)": "bedrock",
  "Amazon S3": "s3",
  "Amazon SES": "ses",
  "Amazon SNS": "sns",
};

export function ServiceStatusBanner() {
  const t = useTranslations("app.status");
  const { serviceOutages } = useAppShell();
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || serviceOutages.length === 0) return null;

  const labels = serviceOutages.map((name) => {
    const slug = SERVICE_SLUG[name];
    return slug ? t(`services.${slug}` as "services.api") : name;
  });
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} ${t("and")} ${labels[labels.length - 1]}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-warning/40 bg-warning/10 print:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-foreground">
          <span className="font-medium">{t("prefix")}</span>{" "}
          {list}. {t("suffix")}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t("dismiss")}
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
