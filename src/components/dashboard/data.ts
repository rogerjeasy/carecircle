// Demo data for the coordinator/family dashboard.

import type { WeekDay } from "./types";

export const weekAtGlance: WeekDay[] = [
  { day: "Mon", status: "good", label: "Good day" },
  { day: "Tue", status: "good", label: "Good day" },
  { day: "Wed", status: "okay", label: "Okay" },
  { day: "Thu", status: "attention", label: "Needed attention" },
  { day: "Fri", status: "good", label: "Good day" },
  { day: "Sat", status: "good", label: "Good day" },
  { day: "Sun", status: "unknown", label: "Today" },
];

export const sparklineData = [
  { v: 130 }, { v: 128 }, { v: 132 }, { v: 126 }, { v: 129 }, { v: 128 }, { v: 128 },
];

export const medications = [
  { time: "8:00 AM", name: "Metformin 500mg", status: "given", givenBy: "Grace" },
  { time: "12:00 PM", name: "Lisinopril 10mg", status: "given", givenBy: "Maria" },
  { time: "6:00 PM", name: "Metformin 500mg", status: "upcoming" },
  { time: "9:00 PM", name: "Atorvastatin 20mg", status: "upcoming" },
];

export const timelineUpdates = [
  {
    id: 1,
    type: "med",
    text: "Afternoon medication given",
    time: "20 min ago",
    avatar: "GS",
    name: "Grace",
    color: "bg-primary/10 text-primary",
  },
  {
    id: 2,
    type: "vital",
    text: "Blood pressure: 128/82 mmHg — normal",
    time: "2h ago",
    avatar: "MR",
    name: "Maria",
    color: "bg-success/10 text-success",
  },
  {
    id: 3,
    type: "note",
    text: "Antonio enjoyed lunch, ate well today",
    time: "4h ago",
    avatar: "GS",
    name: "Grace",
    color: "bg-info/10 text-info",
  },
  {
    id: 4,
    type: "task",
    text: "Scheduled follow-up with Dr. Chen for Thursday",
    time: "6h ago",
    avatar: "MR",
    name: "Maria",
    color: "bg-accent/10 text-accent",
  },
];

export const fairShareData = [
  { name: "Maria", hours: 12, color: "bg-primary" },
  { name: "Grace", hours: 18, color: "bg-accent" },
  { name: "James", hours: 8, color: "bg-info" },
];
