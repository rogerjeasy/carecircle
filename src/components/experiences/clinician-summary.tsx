"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, FileText, Lock, Pill, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useIsPhone } from "./use-is-phone";
import { useReducedMotion } from "./use-reduced-motion";
import {
  ALLERGIES,
  BP_TREND,
  CONDITIONS,
  CURRENT_MEDS,
  GLUCOSE_TREND,
  MEDICAL_DOCS,
  RECENT_INCIDENTS,
  RECIPIENT,
} from "./data";

/** Clinician read-only clinical summary. */
export function ClinicianSummary() {
  const isPhone = useIsPhone();
  const reduced = useReducedMotion();

  return (
    <div className="space-y-5">
      {/* Access banner */}
      <div className="flex flex-col gap-2 rounded-2xl border border-info/40 bg-info/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Read-only clinical access</p>
            <p className="text-xs text-muted-foreground">
              You can view {RECIPIENT.name}&apos;s clinical record but cannot make changes.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="w-fit gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Access expires in 6 days
        </Badge>
      </div>

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{RECIPIENT.fullName}</h1>
        <p className="mt-1 text-muted-foreground">{RECIPIENT.age} years · DOB {RECIPIENT.dob}</p>
      </div>

      {/* Summary: conditions / allergies / blood type */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Conditions">
          <ul className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <li key={c}>
                <Badge variant="secondary">{c}</Badge>
              </li>
            ))}
          </ul>
        </SummaryCard>
        <SummaryCard title="Allergies">
          <ul className="flex flex-wrap gap-1.5">
            {ALLERGIES.map((a) => (
              <li key={a}>
                <Badge variant="outline" className="border-destructive/40 text-destructive">{a}</Badge>
              </li>
            ))}
          </ul>
        </SummaryCard>
        <SummaryCard title="Blood type">
          <p className="text-2xl font-bold tabular-nums">{RECIPIENT.bloodType}</p>
        </SummaryCard>
      </div>

      {/* Meds + vitals */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        {/* Current medications with adherence */}
        <Card className="p-0">
          <CardContent className="p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Pill className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Current medications
            </h2>
            {isPhone ? (
              <ul className="space-y-2">
                {CURRENT_MEDS.map((m) => (
                  <li key={m.name} className="rounded-xl border bg-card p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium">{m.name} <span className="font-normal text-muted-foreground">{m.strength}</span></p>
                      <span className="text-sm font-semibold tabular-nums">{m.adherence}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.schedule}</p>
                    <AdherenceBar value={m.adherence} className="mt-2" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <table className="w-full min-w-[26rem] text-sm">
                  <caption className="sr-only">Current medications and adherence</caption>
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th scope="col" className="py-2.5 pr-4 text-left font-medium">Medication</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">Schedule</th>
                      <th scope="col" className="py-2.5 pl-4 text-left font-medium">Adherence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CURRENT_MEDS.map((m) => (
                      <tr key={m.name} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{m.name} <span className="font-normal text-muted-foreground">{m.strength}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{m.schedule}</td>
                        <td className="py-3 pl-4">
                          <span className="flex items-center gap-2">
                            <AdherenceBar value={m.adherence} className="w-20" />
                            <span className="tabular-nums text-muted-foreground">{m.adherence}%</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vitals trends */}
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <h2 className="text-base font-semibold">Vitals — last 7 days</h2>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Blood pressure (mmHg)</p>
              <div className="h-40 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={BP_TREND} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={32} domain={[60, 150]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="sys" name="Systolic" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} isAnimationActive={!reduced} />
                    <Line type="monotone" dataKey="dia" name="Diastolic" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} isAnimationActive={!reduced} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Glucose (mg/dL)</p>
              <div className="h-32 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={GLUCOSE_TREND} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={32} domain={[90, 150]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="v" name="Glucose" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} isAnimationActive={!reduced} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="sr-only">
              Blood pressure has been stable around 128 to 134 systolic over the past week. Glucose ranged 109 to 132 mg/dL.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Incidents + documents */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Recent incidents
            </h2>
            <ul className="space-y-2">
              {RECENT_INCIDENTS.map((i) => (
                <li key={i.when} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{i.type}</span>
                    <Badge variant={i.severity === "High" ? "destructive" : "warning"}>{i.severity}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{i.when}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Medical documents
            </h2>
            <ul className="space-y-2">
              {MEDICAL_DOCS.map((d) => (
                <li key={d.title}>
                  <Link
                    href="/documents"
                    className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.title}</span>
                      <span className="block text-xs text-muted-foreground">{d.kind} · {d.date}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function AdherenceBar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-block h-2 overflow-hidden rounded-full bg-muted", className)} aria-hidden="true">
      <span
        className={cn("block h-full rounded-full", value >= 90 ? "bg-success" : value >= 80 ? "bg-warning" : "bg-destructive")}
        style={{ width: `${value}%` }}
      />
    </span>
  );
}
