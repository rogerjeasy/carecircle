// Display config + demo data for the Timeline.

import { Pill, HeartPulse, FileText, Calendar as CalendarIcon, AlertTriangle, Globe, Users, Lock } from "lucide-react";
import type { EventType, TimelineEvent, Visibility } from "./types";

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

// Event type config (med = teal, vital = blue, note = neutral, appointment = accent, incident = red).
export const eventTypeConfig: Record<EventType, { icon: typeof Pill; color: string; label: string }> = {
  med: { icon: Pill, color: "bg-primary/10 text-primary", label: "Medication" },
  vital: { icon: HeartPulse, color: "bg-info/10 text-info", label: "Vital" },
  note: { icon: FileText, color: "bg-muted text-muted-foreground", label: "Note" },
  appointment: { icon: CalendarIcon, color: "bg-accent/10 text-accent", label: "Appointment" },
  incident: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive", label: "Incident" },
};

// Filter chips
export const filterChips = [
  { id: "all", label: "All" },
  { id: "med", label: "Meds" },
  { id: "vital", label: "Vitals" },
  { id: "note", label: "Notes" },
  { id: "appointment", label: "Appointments" },
  { id: "incident", label: "Incidents" },
] as const;

// Visibility options
export const visibilityOptions: { value: Visibility; label: string; icon: typeof Globe; description: string }[] = [
  { value: "everyone", label: "Everyone", icon: Globe, description: "Visible to all circle members" },
  { value: "family", label: "Family only", icon: Users, description: "Only family members can see" },
  { value: "private", label: "Private", icon: Lock, description: "Only you and coordinators" },
];

// Date-range presets for the filter bar.
export const dateRanges = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

const G = { authorName: "Grace Martinez", authorInitials: "GM", authorColor: "bg-primary/10 text-primary" };
const M = { authorName: "Maria Rodriguez", authorInitials: "MR", authorColor: "bg-accent/10 text-accent" };
const C = { authorName: "Carlos Rodriguez", authorInitials: "CR", authorColor: "bg-success/10 text-success" };
const P = { authorName: "Paolo Bianchi", authorInitials: "PB", authorColor: "bg-info/10 text-info" };

// Demo data — spans several days so day-grouping, jump-to-date and load-more are meaningful.
export const demoEvents: TimelineEvent[] = [
  // ---- Today ----
  {
    id: "1",
    type: "med",
    summary: "Grace gave Lisinopril 10mg",
    details: "Morning dose administered with breakfast. Antonio was in good spirits and took it without any fuss.",
    ...G,
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    visibility: "everyone",
    comments: [
      { id: "c1", ...M, text: "Thanks Grace! Did he take it with food?", timestamp: new Date(Date.now() - 1000 * 60 * 25) },
      { id: "c2", ...G, text: "Yes, he had toast and juice first.", timestamp: new Date(Date.now() - 1000 * 60 * 20) },
    ],
    reactions: [{ userId: "maria", type: "heart" }],
  },
  {
    id: "2",
    type: "vital",
    summary: "Blood pressure: 128/82 mmHg",
    details: "Measured after 5 minutes rest. Slightly elevated from yesterday but within normal range.",
    ...G,
    timestamp: new Date(Date.now() - HOUR * 2),
    visibility: "everyone",
    comments: [],
    reactions: [],
  },
  {
    id: "3",
    type: "note",
    summary: "Maria added a note",
    details:
      "Dad mentioned he slept well last night — first time in a week! The new pillow arrangement seems to be helping. He also enjoyed the video call with the grandkids this morning and asked when they're visiting next.",
    ...M,
    timestamp: new Date(Date.now() - HOUR * 4),
    photoUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop",
    visibility: "family",
    comments: [
      { id: "c3", ...C, text: "That's wonderful news! The kids loved seeing abuelo too.", timestamp: new Date(Date.now() - HOUR * 3) },
    ],
    reactions: [{ userId: "carlos", type: "heart" }, { userId: "grace", type: "heart" }],
  },
  {
    id: "4",
    type: "incident",
    summary: "Minor fall reported — no injury",
    details:
      "Antonio stumbled getting out of bed this morning. Grace was present and helped steady him. No visible injuries. He was wearing his non-slip socks. Will monitor throughout the day.",
    ...G,
    timestamp: new Date(Date.now() - HOUR * 6),
    visibility: "everyone",
    isUrgent: true,
    comments: [
      { id: "c4", ...M, text: "Thank you for the quick report Grace. Should we consider getting a bed rail?", timestamp: new Date(Date.now() - HOUR * 5) },
      { id: "c4b", ...C, text: "I can pick one up this weekend.", timestamp: new Date(Date.now() - HOUR * 5 + 1000 * 60 * 20) },
    ],
    reactions: [{ userId: "maria", type: "heart" }],
  },
  {
    id: "5",
    type: "appointment",
    summary: "Physiotherapy session completed",
    details: "Good progress on balance exercises. James suggested continuing daily short walks.",
    ...P,
    timestamp: new Date(Date.now() - HOUR * 8),
    visibility: "everyone",
    comments: [],
    reactions: [{ userId: "maria", type: "heart" }],
  },

  // ---- Yesterday ----
  {
    id: "6",
    type: "med",
    summary: "Grace gave Metformin 500mg",
    ...G,
    timestamp: new Date(Date.now() - DAY - HOUR),
    visibility: "everyone",
    comments: [],
    reactions: [{ userId: "maria", type: "heart" }],
  },
  {
    id: "7",
    type: "note",
    summary: "Coordinator note (private)",
    details: "Need to discuss care schedule changes with the family. Grace requested time off next month.",
    ...M,
    timestamp: new Date(Date.now() - DAY - HOUR * 3),
    visibility: "private",
    comments: [],
    reactions: [],
  },
  {
    id: "8",
    type: "vital",
    summary: "Weight: 72.5 kg",
    details: "Morning weight measurement. Down 0.5kg from last week.",
    ...G,
    timestamp: new Date(Date.now() - DAY - HOUR * 6),
    visibility: "everyone",
    comments: [],
    reactions: [],
  },
  {
    id: "9",
    type: "note",
    summary: "Paolo added a note",
    details: "Watched the football together in the afternoon. He was animated and cheered at the goals — lovely to see.",
    ...P,
    timestamp: new Date(Date.now() - DAY - HOUR * 9),
    visibility: "everyone",
    comments: [],
    reactions: [{ userId: "maria", type: "heart" }, { userId: "carlos", type: "heart" }],
  },

  // ---- 2 days ago ----
  {
    id: "10",
    type: "appointment",
    summary: "Cardiologist visit completed",
    details:
      "Dr. Chen reviewed recent lab work. Heart function stable. Continue current medication regimen. Next appointment in 3 months.",
    ...M,
    timestamp: new Date(Date.now() - DAY * 2 - HOUR * 2),
    visibility: "everyone",
    comments: [{ id: "c10", ...C, text: "Great to hear. Thanks for taking him, Maria.", timestamp: new Date(Date.now() - DAY * 2 - HOUR) }],
    reactions: [{ userId: "grace", type: "heart" }, { userId: "carlos", type: "heart" }],
  },
  {
    id: "11",
    type: "med",
    summary: "Maria gave evening medications",
    details: "All evening doses given on time.",
    ...M,
    timestamp: new Date(Date.now() - DAY * 2 - HOUR * 10),
    visibility: "everyone",
    comments: [],
    reactions: [],
  },

  // ---- 3 days ago ----
  {
    id: "12",
    type: "vital",
    summary: "Blood sugar: 110 mg/dL",
    details: "Fasting reading before breakfast. Within target.",
    ...G,
    timestamp: new Date(Date.now() - DAY * 3 - HOUR * 2),
    visibility: "everyone",
    comments: [],
    reactions: [],
  },
  {
    id: "13",
    type: "note",
    summary: "Grace added a note",
    details: "Antonio enjoyed a long phone call with Lucia. Ate a full lunch — minestrone, his favourite.",
    ...G,
    timestamp: new Date(Date.now() - DAY * 3 - HOUR * 7),
    photoUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop",
    visibility: "everyone",
    comments: [],
    reactions: [{ userId: "maria", type: "heart" }],
  },

  // ---- 6 days ago ----
  {
    id: "14",
    type: "appointment",
    summary: "Dental cleaning",
    details: "Routine cleaning at Bright Smile. No issues found.",
    ...C,
    timestamp: new Date(Date.now() - DAY * 6 - HOUR * 4),
    visibility: "everyone",
    comments: [],
    reactions: [],
  },

  // ---- ~2 weeks ago (outside the 7-day range) ----
  {
    id: "15",
    type: "incident",
    summary: "Dizzy spell — resolved",
    details: "Felt lightheaded standing up. Sat down, had water, recovered within 10 minutes. Mentioned to Dr. Chen.",
    ...G,
    timestamp: new Date(Date.now() - DAY * 13 - HOUR * 5),
    visibility: "everyone",
    comments: [],
    reactions: [{ userId: "maria", type: "heart" }],
  },
];
