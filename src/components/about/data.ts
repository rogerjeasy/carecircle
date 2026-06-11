// Content for the About page, grounded in Kintwadi-Project-Description.md.

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

export const HERO = {
  tagline: "One shared record for everyone caring for someone.",
  subtitle:
    "Kintwadi is the calm, role-aware home for a family's caregiving — across siblings, cities, and time zones. One source of truth for today's meds, the care timeline, appointments, tasks and vitals.",
} as const;

/** Big-picture numbers (the "why now" market story). */
export const STATS: { value: string; label: string }[] = [
  { value: "2.1B", label: "people will be 60+ by 2050 (WHO)" },
  { value: "1 in 6", label: "people globally will be 65+" },
  { value: "1 record", label: "many role-scoped lenses" },
  { value: "0", label: "group chats needed to coordinate" },
];

/** §1 — The problem. */
export const PROBLEMS: { icon: typeof Heart; title: string; body: string }[] = [
  {
    icon: Users,
    title: "The sandwich generation is drowning",
    body: "Adults care for aging parents while raising kids and working. The labor is invisible, unpaid, and emotionally heavy.",
  },
  {
    icon: ClipboardList,
    title: "Coordination is a mess",
    body: "Care runs on WhatsApp threads, paper med lists, and memory. There's no single source of truth, so things fall through the cracks.",
  },
  {
    icon: Pill,
    title: "Dropped details are dangerous",
    body: "Medication errors are among the most common, preventable causes of harm for older adults. “Did Mom take her pills?” shouldn't be a guess.",
  },
  {
    icon: Globe,
    title: "Families are global now",
    body: "The person who loves the patient most is often thousands of kilometres away — and feels powerless and guilty.",
  },
];

/** §2 — What makes Kintwadi different. */
export const DIFFERENTIATORS: { icon: typeof Scale; title: string; body: string }[] = [
  {
    icon: Scale,
    title: "Fair-share visibility",
    body: "Everyone can see who contributed what. Making the invisible labor visible defuses the #1 cause of family caregiving conflict.",
  },
  {
    icon: Sparkles,
    title: "The diaspora digest",
    body: "An AI-written, warm daily update that keeps the faraway relative emotionally connected — turning guilt into participation.",
  },
  {
    icon: Layers,
    title: "One record, many lenses",
    body: "The aide, the remote sibling, the coordinator and the parent each see a view scoped to their role — enforced at the database, not just the UI.",
  },
];

/** §3 — Personas. */
export const PERSONAS: { icon: typeof Heart; name: string; who: string; need: string }[] = [
  { icon: Compass, name: "The Coordinator", who: "Often the “default” organizer.", need: "One place to run everything, and to stop being the single point of failure." },
  { icon: Globe, name: "The Remote Sibling", who: "Loves the parent from afar.", need: "To know Mom is okay today, and an easy way to help from another time zone." },
  { icon: Heart, name: "The Care Recipient", who: "The parent being cared for.", need: "A respectful, simplified view — and control over who sees what." },
  { icon: Stethoscope, name: "The Professional Caregiver", who: "Hired aide / home-health worker.", need: "Clear daily meds & tasks, fast logging, scoped access — never family financials." },
  { icon: Users, name: "The Extended Circle", who: "Relatives, friends, neighbors.", need: "Read-only reassurance and a way to help when asked." },
  { icon: Building2, name: "Care Manager / Agency", who: "Home-care & assisted-living (B2B).", need: "A multi-family dashboard with continuity, accountability and audit." },
];

/** §4 — Feature pillars. */
export const PILLARS: { icon: typeof FileText; title: string; body: string }[] = [
  { icon: FileText, title: "Shared care record", body: "A rich profile, a secure document vault, and an always-current emergency card." },
  { icon: Pill, title: "Medication management", body: "Schedules, give/skip logging, refill alerts, and interaction & allergy warnings." },
  { icon: Activity, title: "Care timeline", body: "One chronological feed of meds, meals, mood, vitals, visits, notes and photos." },
  { icon: Calendar, title: "Appointments", body: "Shared calendar, who's taking them, pre-visit prep and post-visit summaries." },
  { icon: CheckSquare, title: "Tasks & rota", body: "Assignable recurring tasks, a shift schedule, and the gentle fair-share report." },
  { icon: ShieldCheck, title: "Roles & permissions", body: "Distinct roles, granular scoping, a clean invite flow, and an immutable audit log." },
  { icon: HeartPulse, title: "Vitals & health", body: "Blood pressure, glucose, weight, sleep and mood — with trends and threshold alerts." },
  { icon: Sparkles, title: "The smart layer", body: "Daily Digest, decline detection, and Ask Kintwadi in plain language." },
  { icon: Bell, title: "Notifications", body: "Role- and event-aware alerts, urgent escalation, and in-context comments." },
  { icon: Siren, title: "Emergency mode", body: "One tap surfaces a shareable emergency card, ready for EMS or an ER, in any language." },
];

/** §6 — Product principles. */
export const PRINCIPLES: { icon: typeof Heart; title: string; body: string }[] = [
  { icon: Heart, title: "Calm over busy", body: "Stressed caregivers need reassurance, not 40 widgets — one glanceable answer: “Is she okay today?”" },
  { icon: Sparkles, title: "Warm, not clinical", body: "A tender domain handled with a human, dignified tone — respectful, never infantilizing." },
  { icon: Accessibility, title: "Accessible by default", body: "Large type, high contrast, simple flows, screen-reader friendly. Accessibility is the UX." },
  { icon: Smartphone, title: "Mobile-first", body: "Caregiving happens on a phone, on the move — so the experience is built for it." },
  { icon: Layers, title: "One record, many lenses", body: "Each role gets a purpose-built view, so it feels effortless from the aide to the patient." },
  { icon: Eye, title: "Trust through transparency", body: "An append-only audit log and DB-enforced access build medical-grade, family-grade trust." },
];
