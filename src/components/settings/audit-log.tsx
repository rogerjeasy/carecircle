"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lock, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsPhone } from "./use-is-phone";
import { loadCircleAuditLog, type AuditLogEntry } from "@/lib/settings/audit";

/**
 * The append-only, read-only audit log — loaded live from the circle's real `audit_log`. Entries can
 * never be edited or deleted (the table has no UPDATE/DELETE policy); this view only reads.
 */
export function AuditLog() {
  const t = useTranslations("settings.audit");
  const isPhone = useIsPhone();
  const [entries, setEntries] = React.useState<AuditLogEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [actor, setActor] = React.useState("all");
  const [action, setAction] = React.useState("all");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let active = true;
    loadCircleAuditLog().then((res) => {
      if (!active) return;
      if (res.ok) setEntries(res.entries);
      else setError(res.error);
    });
    return () => {
      active = false;
    };
  }, []);

  const actors = React.useMemo(
    () => Array.from(new Set((entries ?? []).map((e) => e.actor.name))),
    [entries],
  );
  const actions = React.useMemo(
    () => Array.from(new Set((entries ?? []).map((e) => e.actionLabel))),
    [entries],
  );

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const rows = entries.filter((e) => {
    if (actor !== "all" && e.actor.name !== actor) return false;
    if (action !== "all" && e.actionLabel !== action) return false;
    if (q && !`${e.actor.name} ${e.actionLabel} ${e.entity}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Immutability note */}
      <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          {t.rich("immutableNote", { b: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t("noActivity")}
        </p>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="h-10 pl-9" aria-label={t("searchAria")} />
            </div>
            <Select value={actor} onValueChange={setActor}>
              <SelectTrigger className="h-10 w-full sm:w-40" aria-label={t("filterActor")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("everyone")}</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-10 w-full sm:w-44" aria-label={t("filterAction")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allActions")}</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {t("noMatch")}
            </p>
          ) : isPhone ? (
            <ul className="space-y-2">
              {rows.map((e) => (
                <li key={e.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className={cn("text-[10px] font-semibold", e.actor.color)}>{e.actor.initials}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 truncate text-sm font-medium">{e.actor.name}</span>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-medium">{e.actionLabel}</span>
                    {e.entity && <span className="text-muted-foreground"> · {e.entity}</span>}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">{e.at}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <caption className="sr-only">{t("caption")}</caption>
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">{t("who")}</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">{t("action")}</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">{t("entity")}</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">{t("when")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e, i) => (
                    <tr key={e.id} className={cn(i % 2 === 1 && "bg-muted/20")}>
                      <td className="px-4 py-2.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className={cn("text-[10px] font-semibold", e.actor.color)}>{e.actor.initials}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{e.actor.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{e.actionLabel}</td>
                      <td className="max-w-[12rem] px-4 py-2.5 text-muted-foreground">
                        <span className="block truncate">{e.entity || "—"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">{e.at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t("showing", { shown: rows.length, total: entries.length })}
          </p>
        </>
      )}
    </div>
  );
}
