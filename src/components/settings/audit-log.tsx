"use client";

import * as React from "react";
import { Lock, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsPhone } from "./use-is-phone";
import { AUDIT_ENTRIES } from "./data";

/**
 * The append-only, read-only audit log. Entries can never be edited or deleted — this view only
 * reads. Real table on tablet+/desktop; stacked cards on phone.
 */
export function AuditLog() {
  const isPhone = useIsPhone();
  const [actor, setActor] = React.useState("all");
  const [action, setAction] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const actors = React.useMemo(() => {
    const seen = new Map<string, string>();
    AUDIT_ENTRIES.forEach((e) => seen.set(e.actor.name, e.actor.name));
    return Array.from(seen.keys());
  }, []);
  const actions = React.useMemo(
    () => Array.from(new Set(AUDIT_ENTRIES.map((e) => e.actionLabel))),
    []
  );

  const q = query.trim().toLowerCase();
  const rows = AUDIT_ENTRIES.filter((e) => {
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
          This log is <span className="font-medium text-foreground">append-only</span> — entries can never be edited or
          deleted, by anyone. It records who did what, and when.
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the log…" className="h-10 pl-9" aria-label="Search audit log" />
        </div>
        <Select value={actor} onValueChange={setActor}>
          <SelectTrigger className="h-10 w-full sm:w-40" aria-label="Filter by actor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-10 w-full sm:w-44" aria-label="Filter by action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No entries match these filters.
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
                <span className="text-muted-foreground">{e.actionLabel} </span>
                <span className="font-medium">{e.entity}</span>
              </p>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">{e.at}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">Audit log — append-only record of actions</caption>
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Who</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Entity</th>
                <th scope="col" className="px-4 py-2.5 font-medium">When</th>
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
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{e.actionLabel}</td>
                  <td className="max-w-[16rem] px-4 py-2.5">
                    <span className="block truncate font-medium">{e.entity}</span>
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
        Showing {rows.length} of {AUDIT_ENTRIES.length} entries.
      </p>
    </div>
  );
}
