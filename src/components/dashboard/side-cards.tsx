"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles, Phone, Users, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import type { DashboardDigest, DashboardFairShare, DashboardOnCall } from "./types";

export function AIDigestCard({ digest }: { digest: DashboardDigest | null }) {
  const t = useTranslations("dashboard.cards");
  const { role } = useAppShell();
  // Mirrors the server's canGenerateDigest(): anyone but a read-only relative may generate.
  const canGenerate = role !== "readonly";
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{t("digestTitle")}</CardTitle>
        </div>
        <CardDescription>{digest?.headline ?? t("digestFallback")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {digest?.paragraph || t("digestEmpty")}
        </p>
        {/* With a digest: invite questions about it. Without one: route whoever may generate it
            straight to the Digest screen's Generate button instead of a dead end. */}
        {digest ? (
          <Link href="/ask">
            <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-primary">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {t("askKintwadi")}
            </Button>
          </Link>
        ) : (
          <Link href={canGenerate ? "/digest" : "/ask"}>
            <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-primary">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {canGenerate ? t("generateDigest") : t("askKintwadi")}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function RotaCard({ onCall }: { onCall: DashboardOnCall | null }) {
  const t = useTranslations("dashboard.cards");
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-success" />
            <CardTitle className="text-base">{t("onCallNow")}</CardTitle>
          </div>
          {onCall && (
            <Badge variant="success" className="text-xs">
              {t("active")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {onCall ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={`${onCall.color} font-semibold`}>{onCall.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{onCall.name}</p>
              <p className="text-xs text-muted-foreground">{onCall.untilLabel}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noOnCall")}</p>
        )}
        <Separator className="my-3" />
        <Link href="/rota">
          <Button variant="ghost" size="sm" className="-ml-2 w-full justify-start">
            {t("viewRota")}
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function FairShareCard({ members }: { members: DashboardFairShare[] }) {
  const t = useTranslations("dashboard.cards");
  const maxHours = Math.max(1, ...members.map((d) => d.hours));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{t("fairShare")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noShifts")}</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{member.name}</span>
                  <span className="text-muted-foreground tabular-nums">{t("hours", { hours: member.hours })}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${member.color} transition-all duration-500`}
                    style={{ width: `${(member.hours / maxHours) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
