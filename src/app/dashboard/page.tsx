"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Pill,
  Calendar,
  CheckSquare,
  HeartPulse,
  Clock,
  Plus,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Phone,
  Users,
  FileText,
  AlertCircle,
  Check,
  X,
  Smile,
  Sun,
  Moon,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

// ============================================================================
// TYPES & DATA
// ============================================================================

type DayStatus = "good" | "okay" | "attention" | "unknown";

interface WeekDay {
  day: string;
  status: DayStatus;
  label: string;
}

const weekAtGlance: WeekDay[] = [
  { day: "Mon", status: "good", label: "Good day" },
  { day: "Tue", status: "good", label: "Good day" },
  { day: "Wed", status: "okay", label: "Okay" },
  { day: "Thu", status: "attention", label: "Needed attention" },
  { day: "Fri", status: "good", label: "Good day" },
  { day: "Sat", status: "good", label: "Good day" },
  { day: "Sun", status: "unknown", label: "Today" },
];

const sparklineData = [
  { v: 130 }, { v: 128 }, { v: 132 }, { v: 126 }, { v: 129 }, { v: 128 }, { v: 128 },
];

const medications = [
  { time: "8:00 AM", name: "Metformin 500mg", status: "given", givenBy: "Grace" },
  { time: "12:00 PM", name: "Lisinopril 10mg", status: "given", givenBy: "Maria" },
  { time: "6:00 PM", name: "Metformin 500mg", status: "upcoming" },
  { time: "9:00 PM", name: "Atorvastatin 20mg", status: "upcoming" },
];

const timelineUpdates = [
  { 
    id: 1,
    type: "med", 
    text: "Afternoon medication given", 
    time: "20 min ago",
    avatar: "GS",
    name: "Grace",
    color: "bg-primary/10 text-primary"
  },
  { 
    id: 2,
    type: "vital", 
    text: "Blood pressure: 128/82 mmHg — normal", 
    time: "2h ago",
    avatar: "MR",
    name: "Maria",
    color: "bg-success/10 text-success"
  },
  { 
    id: 3,
    type: "note", 
    text: "Antonio enjoyed lunch, ate well today", 
    time: "4h ago",
    avatar: "GS",
    name: "Grace",
    color: "bg-info/10 text-info"
  },
  { 
    id: 4,
    type: "task", 
    text: "Scheduled follow-up with Dr. Chen for Thursday", 
    time: "6h ago",
    avatar: "MR",
    name: "Maria",
    color: "bg-accent/10 text-accent"
  },
];

const fairShareData = [
  { name: "Maria", hours: 12, color: "bg-primary" },
  { name: "Grace", hours: 18, color: "bg-accent" },
  { name: "James", hours: 8, color: "bg-info" },
];

// ============================================================================
// HELPER HOOKS
// ============================================================================

function useAnimatedCount(target: number, duration = 1000) {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setCount(target);
      return;
    }
    
    let start = 0;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target, duration]);
  
  return count;
}

function useTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusDot({ status }: { status: DayStatus }) {
  const colors: Record<DayStatus, string> = {
    good: "bg-success",
    okay: "bg-warning",
    attention: "bg-destructive",
    unknown: "bg-muted-foreground/30 ring-2 ring-muted-foreground/50",
  };
  
  return (
    <span 
      className={`h-2.5 w-2.5 rounded-full ${colors[status]} transition-colors`}
      aria-hidden="true"
    />
  );
}

function WeekAtGlance({ days }: { days: WeekDay[] }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {days.map((d, i) => (
        <div 
          key={i} 
          className="flex flex-col items-center gap-1"
          title={`${d.day}: ${d.label}`}
        >
          <StatusDot status={d.status} />
          <span className="text-[10px] text-muted-foreground hidden sm:block">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressRing({ value, max, size = 40 }: { value: number; max: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{value}/{max}</span>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  subtext, 
  icon: Icon, 
  trend,
  delay = 0,
  children,
}: { 
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "stable";
  delay?: number;
  children?: React.ReactNode;
}) {
  return (
    <Card 
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-secondary p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            {subtext && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground/80">{subtext}</p>
            )}
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightBanner({ 
  onDismiss, 
  visible 
}: { 
  onDismiss: () => void; 
  visible: boolean;
}) {
  if (!visible) return null;
  
  return (
    <Card className="border-warning/50 bg-warning/5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-warning/10 p-2">
          <TrendingDown className="h-4 w-4 text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Decline detected</p>
          <p className="text-xs text-muted-foreground">
            Antonio&apos;s weight is down 2kg this month — consider mentioning at Thursday&apos;s visit.
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0 h-8 w-8 p-0"
          onClick={onDismiss}
          aria-label="Dismiss insight"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBanner({ role }: { role: string }) {
  const isCaregiver = role === "caregiver";
  const isReadonly = role === "readonly";
  
  if (isCaregiver) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              AS
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">Your shift</h3>
              <Badge variant="secondary" className="text-xs">Until 6 PM</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              3 tasks to complete · 2 medications due
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button size="sm" variant="outline">View tasks</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isReadonly) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-12 w-12 border-2 border-success/20">
            <AvatarFallback className="bg-success/10 text-success font-semibold">
              AS
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">Antonio is doing well</h3>
              <Smile className="h-4 w-4 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              All medications on track · Grace is on call today
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Default: Coordinator/Family view
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12 border-2 border-success/20">
          <AvatarFallback className="bg-success/10 text-success font-semibold">
            AS
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">Antonio is having a good day</h3>
            <Smile className="h-4 w-4 text-success" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mood: cheerful · Last update 20 min ago by Grace
          </p>
        </div>
        <WeekAtGlance days={weekAtGlance} />
      </CardContent>
    </Card>
  );
}

function AIDigestCard() {
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Daily Digest</CardTitle>
        </div>
        <CardDescription>AI-generated summary</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted animate-pulse" 
                 style={{ background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            <div className="h-4 w-4/5 rounded bg-muted animate-pulse"
                 style={{ background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", animationDelay: "0.1s" }} />
            <div className="h-4 w-3/5 rounded bg-muted animate-pulse"
                 style={{ background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", animationDelay: "0.2s" }} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Antonio had a positive day. All medications were administered on schedule. 
            Blood pressure readings remain stable. Grace noted he enjoyed lunch and 
            was in good spirits during the afternoon walk.
          </p>
        )}
        <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-primary">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Ask CareCircle
        </Button>
      </CardContent>
    </Card>
  );
}

function RotaCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-success" />
            <CardTitle className="text-base">On call now</CardTitle>
          </div>
          <Badge variant="success" className="text-xs">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-accent/10 text-accent font-semibold">
              GS
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">Grace Santos</p>
            <p className="text-xs text-muted-foreground">Until 6:00 PM</p>
          </div>
        </div>
        <Separator className="my-3" />
        <Link href="/rota">
          <Button variant="ghost" size="sm" className="-ml-2 w-full justify-start">
            View full rota
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function FairShareCard() {
  const maxHours = Math.max(...fairShareData.map(d => d.hours));
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Fair share this week</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fairShareData.map((member) => (
            <div key={member.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{member.name}</span>
                <span className="text-muted-foreground tabular-nums">{member.hours}h</span>
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
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { label: "Log medication", icon: Pill, href: "/medications" },
    { label: "Add update", icon: FileText, href: "/timeline" },
    { label: "New task", icon: CheckSquare, href: "/tasks" },
    { label: "Report incident", icon: AlertCircle, href: "/timeline?type=incident" },
  ];
  
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link key={action.label} href={action.href}>
          <Button variant="secondary" size="sm" className="gap-2">
            <action.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{action.label}</span>
            <span className="sm:hidden">{action.label.split(" ")[0]}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DashboardContent() {
  const { role } = useAppShell();
  const timeOfDay = useTimeOfDay();
  const [insightVisible, setInsightVisible] = React.useState(true);
  
  const medsGiven = useAnimatedCount(3, 800);
  const openTasks = useAnimatedCount(2, 800);
  
  const greeting = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
  }[timeOfDay];
  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl truncate">
            {greeting}, Maria
          </h2>
          <p className="mt-1 text-muted-foreground">{today}</p>
        </div>
        <QuickActions />
      </div>

      {/* Status Banner - Role Aware */}
      <StatusBanner role={role} />

      {/* Insight Banner - Dismissible */}
      {role !== "readonly" && (
        <InsightBanner 
          visible={insightVisible} 
          onDismiss={() => setInsightVisible(false)} 
        />
      )}

      {/* Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          label="Medications today" 
          value={`${medsGiven} of 4`}
          subtext="Next: 6:00 PM"
          icon={Pill}
          delay={0}
        >
          <ProgressRing value={medsGiven} max={4} />
        </StatCard>
        
        <StatCard 
          label="Next appointment" 
          value="Thu 10:00"
          subtext="Cardiologist · Dr. Chen"
          icon={Calendar}
          delay={50}
        />
        
        <StatCard 
          label="Open tasks" 
          value={`${openTasks} open`}
          subtext="1 due today"
          icon={CheckSquare}
          delay={100}
        />
        
        <StatCard 
          label="Latest vitals" 
          value="128/82"
          subtext="Blood pressure · Normal"
          icon={HeartPulse}
          delay={150}
        >
          <div className="h-10 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="v" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </StatCard>
      </div>

      {/* Main Two-Column Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Wider */}
        <div className="space-y-6 lg:col-span-2">
          {/* Medications Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Today&apos;s care</CardTitle>
                <CardDescription>Medication schedule</CardDescription>
              </div>
              <Link href="/medications">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {medications.map((med, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      med.status === "given" ? "bg-success/10" : "bg-muted"
                    }`}>
                      <Pill className={`h-5 w-5 ${
                        med.status === "given" ? "text-success" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{med.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {med.time}
                        {med.givenBy && ` · by ${med.givenBy}`}
                      </p>
                    </div>
                    {med.status === "given" ? (
                      <Badge variant="success" className="shrink-0">
                        <Check className="mr-1 h-3 w-3" />
                        Given
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="shrink-0">
                        Mark given
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent updates</CardTitle>
                <CardDescription>From the care circle</CardDescription>
              </div>
              <Link href="/timeline">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineUpdates.map((update) => (
                  <div key={update.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`text-xs font-semibold ${update.color}`}>
                        {update.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{update.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {update.name} · {update.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Narrower */}
        <div className="space-y-6">
          <AIDigestCard />
          <RotaCard />
          <FairShareCard />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
