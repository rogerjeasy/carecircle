// Structure for the About page. Display text lives in messages/*.json (the `about` namespace) and
// is resolved at render via t() — keyed by the stable keys below. Grounded in
// Kintwadi-Project-Description.md.

import {
  Accessibility,
  Activity,
  Bell,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardList,
  Compass,
  Eye,
  FileText,
  Globe,
  Heart,
  HeartPulse,
  Layers,
  Pill,
  Scale,
  ShieldCheck,
  Siren,
  Smartphone,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

/** Big-picture numbers (the "why now" market story); text under `about.stats.<key>`. */
export const STATS = ["people", "age65", "oneRecord", "zeroChats"] as const;

/** §1 — The problem. Text under `about.problem.items.<key>`. */
export const PROBLEMS = [
  { icon: Users, key: "sandwich" },
  { icon: ClipboardList, key: "coordination" },
  { icon: Pill, key: "details" },
  { icon: Globe, key: "global" },
] as const;

/** §2 — What makes Kintwadi different. Text under `about.difference.items.<key>`. */
export const DIFFERENTIATORS = [
  { icon: Scale, key: "fairShare" },
  { icon: Sparkles, key: "diaspora" },
  { icon: Layers, key: "oneRecord" },
] as const;

/** §3 — Personas. Text under `about.personas.items.<key>`. */
export const PERSONAS = [
  { icon: Compass, key: "coordinator" },
  { icon: Globe, key: "remoteSibling" },
  { icon: Heart, key: "careRecipient" },
  { icon: Stethoscope, key: "professional" },
  { icon: Users, key: "extended" },
  { icon: Building2, key: "agency" },
] as const;

/** §4 — Feature pillars. Text under `about.pillars.items.<key>`. */
export const PILLARS = [
  { icon: FileText, key: "record" },
  { icon: Pill, key: "medication" },
  { icon: Activity, key: "timeline" },
  { icon: Calendar, key: "appointments" },
  { icon: CheckSquare, key: "tasks" },
  { icon: ShieldCheck, key: "roles" },
  { icon: HeartPulse, key: "vitals" },
  { icon: Sparkles, key: "smart" },
  { icon: Bell, key: "notifications" },
  { icon: Siren, key: "emergency" },
] as const;

/** §6 — Product principles. Text under `about.principles.items.<key>`. */
export const PRINCIPLES = [
  { icon: Heart, key: "calm" },
  { icon: Sparkles, key: "warm" },
  { icon: Accessibility, key: "accessible" },
  { icon: Smartphone, key: "mobile" },
  { icon: Layers, key: "lenses" },
  { icon: Eye, key: "transparency" },
] as const;
