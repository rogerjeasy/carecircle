"use client";

/**
 * Shared building blocks for the platform super-admin console.
 *
 * Every `/admin/*` route composes these so the design system (evergreen/apricot tokens, rounded-2xl
 * cards, soft shadows, motion-safe entrances honoring prefers-reduced-motion) stays consistent and
 * there is a single source of truth. These are presentational only — pages pass REAL data fetched
 * through the audited cross-tenant path (src/db/admin-queries.ts). When the server returns nothing,
 * components render a proper `EmptyState` — they never fabricate placeholder rows.
 */

import * as React from "react";
import {
  Activity,
  Users,
  Pill,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  HardDrive,
  Mail,
  Bell,
  Building2,
  MapPin,
  Clock,
  FileText,
  ArrowRight,
  CheckCircle2,
  LogIn,
  FileDown,
  UserCog,
  Gauge,
  BadgeCheck,
  Inbox,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type Kpi,
  type Trend,
  type AuditAction,
  type AuditEvent,
  type Service,
  type ServiceStatus,
  type Alert,
  type Tenant,
} from "@/lib/admin/dashboard-data";

/** Activity-chart datapoint (mirrors the server's ActivityPoint; kept local to stay client-safe). */
export type ActivityPoint = { day: string; events: number; logins: number };

// ── motion ───────────────────────────────────────────────────────────────────
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

// ── icon registry ─────────────────────────────────────────────────────────────
// Server Components can't pass component functions across the boundary to this client module, so
// callers reference icons by a string key and we resolve them here.
const ICONS = {
  shield: ShieldCheck,
  login: LogIn,
  export: FileDown,
  userCog: UserCog,
  server: Server,
  activity: Activity,
  gauge: Gauge,
  alert: AlertTriangle,
  building: Building2,
  users: Users,
  badge: BadgeCheck,
} as const;

export type AdminIconName = keyof typeof ICONS;

// ── page header (shared chrome for every admin route) ─────────────────────────
export function AdminPageHeader({
  title,
  description,
  icon,
  badge,
  actions,
}: {
  title: string;
  description: string;
  icon?: AdminIconName;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const Icon = icon ? ICONS[icon] : undefined;
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {Icon ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            ) : null}
            <span className="min-w-0 break-words">{title}</span>
          </h1>
          {badge}
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </section>
  );
}

const RANGES = ["24h", "7d", "30d"] as const;

export function RangeToggle({ defaultRange = "7d" }: { defaultRange?: (typeof RANGES)[number] }) {
  const [range, setRange] = React.useState<(typeof RANGES)[number]>(defaultRange);
  return (
    <div
      className="inline-flex shrink-0 rounded-xl border border-border bg-card p-1"
      role="group"
      aria-label="Time range"
    >
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          aria-pressed={range === r}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ── animated KPI numbers ──────────────────────────────────────────────────────
function formatValue(n: number, format?: Kpi["format"]) {
  if (format === "percent") return `${n.toFixed(2)}%`;
  if (format === "ms") return `${Math.round(n)}ms`;
  return Math.round(n).toLocaleString();
}

function AnimatedNumber({ value, format }: { value: number; format?: Kpi["format"] }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(reduced ? value : 0);

  React.useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let startTs = 0;
    const duration = 900;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return <>{formatValue(display, format)}</>;
}

function TrendPill({ trend }: { trend: Trend }) {
  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        trend.good ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {trend.value}
    </span>
  );
}

/**
 * Friendly empty state shown whenever the server returns no data — never demo rows.
 * Centered icon medallion + title + optional description, in the muted palette.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-inset ring-border">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

const KPI_ICONS: Record<string, React.ElementType> = {
  circles: Building2,
  users: Users,
  meds: Pill,
  audit: ShieldCheck,
  incidents: AlertTriangle,
  latency: Activity,
  uptime: Server,
  digests: Mail,
  members: Users,
  invites: Mail,
};

export function StatCard({ kpi, delay = 0 }: { kpi: Kpi; delay?: number }) {
  const Icon = KPI_ICONS[kpi.key] ?? Activity;
  return (
    <Card
      className="min-w-0 transition-shadow duration-200 hover:shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* sm:p-5 is required: CardContent's base class sets sm:pt-0 (assumes a CardHeader);
          without an sm-level override the top padding collapses to 0 on ≥sm screens. */}
      <CardContent className="p-5 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <TrendPill trend={kpi.trend} />
        </div>
        <p className="mt-4 truncate text-2xl font-semibold tabular-nums sm:text-3xl">
          <AnimatedNumber value={kpi.value} format={kpi.format} />
        </p>
        <p className="mt-1 truncate text-sm font-medium text-foreground">{kpi.label}</p>
        <p className="truncate text-xs text-muted-foreground">{kpi.hint}</p>
      </CardContent>
    </Card>
  );
}

/** Lightweight stat tile (no trend / animation) for page summary rows. */
export function MiniStat({
  icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: AdminIconName;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const Icon = ICONS[icon];
  const toneMap = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    success: "bg-success/15 text-success ring-success/25",
    warning: "bg-warning/15 text-warning ring-warning/25",
    destructive: "bg-destructive/15 text-destructive ring-destructive/25",
  } as const;
  return (
    <Card className="min-w-0 transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset",
            toneMap[tone]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold leading-none tabular-nums">{value}</p>
          <p className="mt-1.5 truncate text-sm font-medium text-foreground">{label}</p>
          {sub ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ── charts ─────────────────────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="capitalize">{p.name}</span>:{" "}
          <span className="tabular-nums text-foreground">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Recharts' `ResponsiveContainer` renders once with width/height of -1 before its internal observer
 * supplies real dimensions, which logs a console warning (and fires under SSR where there's no
 * layout at all). Instead we measure the wrapper ourselves with a ResizeObserver and clone explicit
 * numeric `width`/`height` onto the chart only once we have a positive width — so the chart never
 * sees -1, stays fully responsive on resize, and emits no warning.
 */
const CHART_HEIGHT = 240;

function ChartFrame({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-[240px] w-full min-w-0">
      {width > 0 ? React.cloneElement(children, { width, height: CHART_HEIGHT }) : null}
    </div>
  );
}

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const hasData = data.some((p) => p.events > 0 || p.logins > 0);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Platform activity</CardTitle>
        <p className="text-sm text-muted-foreground">Events recorded per day · last 14 days</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Audit events across all circles will chart here as the platform is used."
          />
        ) : (
        <ChartFrame>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="events" name="events" stroke="var(--color-primary)" strokeWidth={2} fill="url(#evGrad)" />
          </AreaChart>
        </ChartFrame>
        )}
      </CardContent>
    </Card>
  );
}

/** Real sign-ins per day, derived from the same audit activity series (login events). */
export function SignInsChart({ data }: { data: ActivityPoint[] }) {
  const hasData = data.some((p) => p.logins > 0);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Sign-ins</CardTitle>
        <p className="text-sm text-muted-foreground">Authenticated logins · last 14 days</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState
            icon={LogIn}
            title="No sign-ins yet"
            description="Successful logins across all circles will chart here."
          />
        ) : (
          <ChartFrame>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
              <Bar dataKey="logins" name="sign-ins" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
        )}
      </CardContent>
    </Card>
  );
}

// ── audit log ──────────────────────────────────────────────────────────────────
const ACTION_META: Record<AuditAction, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  login: { label: "Login", variant: "info" },
  logout: { label: "Logout", variant: "secondary" },
  create: { label: "Create", variant: "success" },
  update: { label: "Update", variant: "warning" },
  delete: { label: "Delete", variant: "destructive" },
  export: { label: "Export", variant: "accent" },
  invite: { label: "Invite", variant: "default" },
  read: { label: "Read", variant: "outline" },
};

const AUDIT_FILTERS: { key: string; label: string; match: (e: AuditEvent) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "auth", label: "Auth", match: (e) => e.action === "login" || e.action === "logout" },
  { key: "meds", label: "Medications", match: (e) => e.entity.startsWith("medication") },
  { key: "docs", label: "Documents", match: (e) => e.entity === "document" || e.action === "export" },
  { key: "roles", label: "Roles & invites", match: (e) => e.entity === "membership" || e.action === "invite" },
];

function ActionBadge({ action }: { action: AuditAction }) {
  const meta = ACTION_META[action];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function AuditLog({
  limit,
  footerHref,
  events,
}: {
  limit?: number;
  footerHref?: string;
  events?: AuditEvent[];
}) {
  const [active, setActive] = React.useState("all");
  const filter = AUDIT_FILTERS.find((f) => f.key === active) ?? AUDIT_FILTERS[0];
  // Real audit rows only — no demo fallback. Empty ⇒ a proper empty state below.
  const source = events ?? [];
  const matched = source.filter(filter.match);
  const rows = limit ? matched.slice(0, limit) : matched;
  const isEmpty = source.length === 0;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              Security &amp; audit log
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Append-only ledger across all care circles — who did what, when.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            <FileText className="h-4 w-4" />
            Export
          </Button>
        </div>
        {!limit ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter audit events">
            {AUDIT_FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={active === f.key}
                onClick={() => setActive(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active === f.key
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {isEmpty ? (
          <EmptyState
            icon={ShieldCheck}
            title="No audit events yet"
            description="Every sensitive action — sign-ins, medications, invites, role changes, document access — appears here the moment it happens across any circle."
          />
        ) : (
        <>
        {/* Desktop / tablet: real table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-5 py-2.5 font-medium">Actor</th>
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-5 py-2.5 font-medium">Summary</th>
                <th className="px-5 py-2.5 font-medium">Circle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">{e.time}</td>
                  <td className="px-5 py-3">
                    <span className="font-medium">{e.actor}</span>
                    <span className="block text-xs text-muted-foreground">{e.role}</span>
                  </td>
                  <td className="px-5 py-3"><ActionBadge action={e.action} /></td>
                  <td className="max-w-sm px-5 py-3">
                    <span className="block truncate" title={e.summary}>{e.summary}</span>
                    <span className="block truncate text-xs text-muted-foreground">{e.entity}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{e.circle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phone: stacked cards (no sideways scroll) */}
        <ul className="divide-y divide-border md:hidden">
          {rows.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <ActionBadge action={e.action} />
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{e.time}</span>
              </div>
              <p className="mt-2 break-words text-sm">{e.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.actor} · {e.role} · {e.circle}
              </p>
            </li>
          ))}
        </ul>
        </>
        )}

        {footerHref ? (
          <div className="border-t border-border p-3 text-center">
            <Button asChild variant="ghost" size="sm">
              <a href={footerHref}>
                View full audit log
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── system health ──────────────────────────────────────────────────────────────
const SERVICE_ICONS: Record<string, React.ElementType> = {
  "API / Server Actions": Server,
  "Aurora PostgreSQL": Database,
  "Amazon Bedrock (Claude)": Cpu,
  "Amazon S3": HardDrive,
  "Amazon SES": Mail,
  "Amazon SNS": Bell,
};

const STATUS_META: Record<ServiceStatus, { label: string; variant: React.ComponentProps<typeof Badge>["variant"]; dot: string }> = {
  operational: { label: "Operational", variant: "success", dot: "bg-success" },
  degraded: { label: "Degraded", variant: "warning", dot: "bg-warning" },
  down: { label: "Down", variant: "destructive", dot: "bg-destructive" },
};

/** A single banner summarizing whether everything is healthy or some services are degraded/down. */
export function SystemStatusBanner({ services: list }: { services: Service[] }) {
  const degraded = list.filter((s) => s.status !== "operational");
  const allOk = degraded.length === 0;
  return (
    <Card
      className={cn(
        "border",
        allOk ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5",
      )}
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              allOk ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
            )}
          >
            {allOk ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <AlertTriangle className="h-5 w-5" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {allOk ? "All systems operational" : `${degraded.length} service needs attention`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {allOk
                ? "Every platform service is responding normally."
                : `Degraded: ${degraded.map((s) => s.name).join(", ")}`}
            </p>
          </div>
        </div>
        <Badge variant={allOk ? "success" : "warning"} className="shrink-0 gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", allOk ? "bg-success" : "bg-warning")} aria-hidden />
          {allOk ? "Operational" : "Degraded"}
        </Badge>
      </CardContent>
    </Card>
  );
}

export function SystemHealth({ services: list }: { services: Service[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" aria-hidden />
          System health
        </CardTitle>
        <p className="text-sm text-muted-foreground">AWS + Vercel services powering the platform.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.map((s) => {
          const Icon = SERVICE_ICONS[s.name] ?? Server;
          const meta = STATUS_META[s.status];
          return (
            <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.detail}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={meta.variant} className="gap-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
                  {meta.label}
                </Badge>
                <span className="text-xs tabular-nums text-muted-foreground">{s.metric}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function SafetyAlerts({ alerts }: { alerts: Alert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />
          Safety alerts
        </CardTitle>
        <p className="text-sm text-muted-foreground">Decline &amp; risk signals surfaced across circles.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All clear"
            description="No urgent or incident signals across any circle right now."
          />
        ) : null}
        {alerts.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3",
              a.level === "high" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                a.level === "high" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">
                {a.circle} · {a.time}
              </p>
            </div>
            <Badge variant={a.level === "high" ? "destructive" : "warning"} className="shrink-0 capitalize">
              {a.level}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── tenants ─────────────────────────────────────────────────────────────────────
/** Full tenants table — lives inside a contained x-scroll on small screens. */
export function TenantsTable({ tenants: list }: { tenants: Tenant[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
              Care circles
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Tenants on the platform and their recent activity.</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            View all
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {list.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No care circles yet"
            description="Care circles created by families will appear here, each isolated by row-level security."
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Circle</th>
                <th className="px-5 py-2.5 font-medium">Region</th>
                <th className="px-5 py-2.5 font-medium">Members</th>
                <th className="px-5 py-2.5 font-medium">Plan</th>
                <th className="px-5 py-2.5 font-medium">Last active</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <span className="font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.recipient}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{t.region}</td>
                  <td className="px-5 py-3 tabular-nums">{t.members}</td>
                  <td className="px-5 py-3">
                    <Badge variant={t.plan === "Plus" ? "default" : "outline"}>{t.plan}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{t.lastActive}</td>
                  <td className="px-5 py-3">
                    <Badge variant={t.status === "healthy" ? "success" : "warning"} className="capitalize">
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Tenant card grid — a real tablet layout (3 → 2 → 1) instead of a stretched table. */
export function TenantCards({ tenants: list }: { tenants: Tenant[] }) {
  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Building2}
            title="No care circles yet"
            description="Care circles created by families will appear here, each isolated by row-level security."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((t) => {
        const attention = t.status === "attention";
        return (
          <Card
            key={t.id}
            className={cn(
              "min-w-0 overflow-hidden transition-shadow duration-200 hover:shadow-md",
              attention && "ring-1 ring-warning/30"
            )}
          >
            {/* slim status accent along the top edge */}
            <div className={cn("h-1 w-full", attention ? "bg-warning/70" : "bg-success/60")} aria-hidden />
            <CardContent className="p-5 sm:p-5">
              {/* Header: avatar · name/recipient · status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.recipient}</p>
                  </div>
                </div>
                <Badge variant={attention ? "warning" : "success"} className="shrink-0 gap-1.5 capitalize">
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", attention ? "bg-warning" : "bg-success")}
                    aria-hidden
                  />
                  {t.status}
                </Badge>
              </div>

              <div className="my-4 h-px bg-border" />

              {/* Details: icon-labelled, generous rhythm */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Region
                  </dt>
                  <dd className="mt-1 truncate font-medium">{t.region}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Members
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums">{t.members}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Plan
                  </dt>
                  <dd className="mt-1.5">
                    <Badge variant={t.plan === "Plus" ? "default" : "outline"}>{t.plan}</Badge>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Last active
                  </dt>
                  <dd className="mt-1 truncate font-medium">{t.lastActive}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

// ── shared footer note ───────────────────────────────────────────────────────
export function DemoFootnote({ children }: { children: React.ReactNode }) {
  return <p className="pb-4 text-center text-xs text-muted-foreground">{children}</p>;
}
