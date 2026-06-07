"use client";

import * as React from "react";
import { toast } from "sonner";
import { Activity, Check, HeartPulse, ListChecks, Pill, Send, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RECIPIENT, TODAY_DOSES, TODAY_TASKS, type Dose, type ShiftTask } from "./data";

/** Caregiver "My shift today" — only what an aide on the move needs, with big tap targets. */
export function CaregiverToday() {
  const [doses, setDoses] = React.useState<Dose[]>(TODAY_DOSES);
  const [tasks, setTasks] = React.useState<ShiftTask[]>(TODAY_TASKS);
  const [update, setUpdate] = React.useState("");

  const markGiven = (id: string) => {
    setDoses((prev) => prev.map((d) => (d.id === id ? { ...d, given: true } : d)));
    const d = doses.find((x) => x.id === id);
    if (d) toast.success(`${d.name} ${d.strength} marked given`);
  };
  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const postUpdate = () => {
    if (!update.trim()) return;
    toast.success("Update posted to the timeline");
    setUpdate("");
  };

  const givenCount = doses.filter((d) => d.given).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Sun className="h-4 w-4" aria-hidden="true" />
            My shift today
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Caring for {RECIPIENT.name}
          </h1>
          <p className="mt-1 text-muted-foreground">He&apos;s had a calm morning. {givenCount} of {doses.length} doses given so far.</p>
        </div>
        <Badge variant="success" className="w-fit gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          On shift
        </Badge>
      </div>

      {/* 2-up sections */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Medications */}
        <SectionCard icon={Pill} title="Today's medications">
          <ul className="space-y-2.5">
            {doses.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-medium", d.given && "text-muted-foreground line-through")}>
                    {d.name} <span className="font-normal text-muted-foreground">{d.strength}</span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{d.time} · {d.purpose}</p>
                </div>
                {d.given ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-success">
                    <Check className="h-4 w-4" aria-hidden="true" /> Given
                  </span>
                ) : (
                  <Button size="sm" className="h-11 shrink-0 px-4" onClick={() => markGiven(d.id)}>
                    Mark given
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Tasks */}
        <SectionCard icon={ListChecks} title="My tasks">
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <Checkbox
                  id={`task-${t.id}`}
                  checked={t.done}
                  onCheckedChange={() => toggleTask(t.id)}
                  className="h-6 w-6"
                />
                <label
                  htmlFor={`task-${t.id}`}
                  className={cn("min-w-0 flex-1 cursor-pointer text-sm font-medium", t.done && "text-muted-foreground line-through")}
                >
                  {t.title}
                </label>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Vitals to record */}
        <SectionCard icon={HeartPulse} title="Vitals to record">
          <p className="mb-3 text-sm text-muted-foreground">Tap to record a quick reading.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Blood pressure", icon: HeartPulse },
              { label: "Blood sugar", icon: Activity },
              { label: "Weight", icon: Activity },
              { label: "Temperature", icon: HeartPulse },
            ].map((v) => (
              <Button
                key={v.label}
                variant="outline"
                className="h-auto min-h-[3.5rem] flex-col gap-1 py-3"
                onClick={() => toast(`Record ${v.label.toLowerCase()}`)}
              >
                <v.icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">{v.label}</span>
              </Button>
            ))}
          </div>
        </SectionCard>

        {/* Add update */}
        <SectionCard icon={Send} title="Add an update">
          <Textarea
            value={update}
            onChange={(e) => setUpdate(e.target.value)}
            placeholder={`Share a quick note about ${RECIPIENT.name}'s day…`}
            rows={4}
            aria-label="Add an update"
          />
          <div className="mt-3 flex justify-end">
            <Button className="h-11" onClick={postUpdate} disabled={!update.trim()}>
              <Send className="h-4 w-4" />
              <span className="ml-1">Post update</span>
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Pill;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        <div className="min-h-0 flex-1">{children}</div>
      </CardContent>
    </Card>
  );
}
