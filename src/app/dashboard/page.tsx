"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Pill,
  Calendar,
  CheckSquare,
  HeartPulse,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

// Sample data
const upcomingMeds = [
  { time: "8:00 AM", name: "Metformin 500mg", status: "given" },
  { time: "12:00 PM", name: "Lisinopril 10mg", status: "upcoming" },
  { time: "6:00 PM", name: "Metformin 500mg", status: "upcoming" },
  { time: "9:00 PM", name: "Atorvastatin 20mg", status: "upcoming" },
];

const recentActivity = [
  { type: "med", text: "Morning medications given by Maria", time: "2h ago" },
  { type: "vital", text: "Blood pressure: 128/82 mmHg", time: "3h ago" },
  { type: "task", text: "Scheduled follow-up with Dr. Chen", time: "5h ago" },
  { type: "note", text: "Antonio reported feeling better today", time: "6h ago" },
];

const quickStats = [
  { label: "Meds Today", value: "1/4", icon: Pill, color: "text-primary" },
  { label: "Appointments", value: "2", icon: Calendar, color: "text-info" },
  { label: "Open Tasks", value: "5", icon: CheckSquare, color: "text-accent" },
  { label: "Vitals Logged", value: "3", icon: HeartPulse, color: "text-success" },
];

const careTeam = [
  { name: "Maria S.", role: "Coordinator", initials: "MS", active: true },
  { name: "Dr. Chen", role: "Physician", initials: "DC", active: false },
  { name: "James R.", role: "Caregiver", initials: "JR", active: true },
  { name: "Nurse Amy", role: "Home Health", initials: "NA", active: false },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold sm:text-3xl">
              Good morning, Maria
            </h2>
            <p className="mt-1 text-muted-foreground">
              Antonio is having a good day. All morning meds given.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
        </div>

        {/* Alert Banner */}
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Medication refill needed</p>
              <p className="text-xs text-muted-foreground">
                Metformin supply running low - 5 days remaining
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0">
              Order Refill
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`rounded-xl bg-secondary p-2.5 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Medications Today - Takes 2 columns on large screens */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Medications Today</CardTitle>
                <CardDescription>4 scheduled doses</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMeds.map((med, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{med.name}</p>
                      <p className="text-xs text-muted-foreground">{med.time}</p>
                    </div>
                    {med.status === "given" ? (
                      <Badge variant="success">Given</Badge>
                    ) : (
                      <Badge variant="secondary">Upcoming</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Care Team */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Care Team</CardTitle>
              <CardDescription>4 members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {careTeam.map((member) => (
                  <div key={member.name} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-secondary text-xs font-semibold">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      {member.active && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest updates from the care circle</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              View Timeline
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health Trends Placeholder */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Health Trends</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </div>
            <Badge variant="success" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Stable
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Health trends chart placeholder
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
