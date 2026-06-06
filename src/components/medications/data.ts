// Demo seed data + display constants for the Medications screen.
// (Static mock data — the real app would load these from the circle-scoped DAL.)

import { Sun, Sunrise, Sunset, Moon } from "lucide-react";
import type { Dose, Medication, Period, PrnMed } from "./types";

export const LOW_SUPPLY_THRESHOLD = 7;
export const PERIOD_ORDER: Period[] = ["Morning", "Afternoon", "Evening", "Night"];

export const periodMeta: Record<Period, { icon: typeof Sun; tint: string }> = {
  Morning: { icon: Sunrise, tint: "text-warning" },
  Afternoon: { icon: Sun, tint: "text-warning" },
  Evening: { icon: Sunset, tint: "text-accent" },
  Night: { icon: Moon, tint: "text-info" },
};

export const initialDoses: Dose[] = [
  // Morning
  { id: "d1", medId: "lisinopril", name: "Lisinopril", strength: "10mg", purpose: "Blood pressure", time: "8:00am", period: "Morning", status: "given", givenAt: "8:04am", givenByName: "Grace", givenVia: "caregiver" },
  { id: "d2", medId: "metformin", name: "Metformin", strength: "500mg", purpose: "Blood sugar", time: "8:00am", period: "Morning", status: "given", givenAt: "8:06am", givenByName: "Grace", givenVia: "caregiver" },
  { id: "d3", medId: "vitamind", name: "Vitamin D", strength: "1000 IU", purpose: "Bone health", time: "8:00am", period: "Morning", status: "given", givenAt: "8:06am", givenByName: "Grace", givenVia: "caregiver" },
  // Afternoon
  { id: "d4", medId: "aspirin", name: "Aspirin", strength: "81mg", purpose: "Heart", time: "1:00pm", period: "Afternoon", status: "missed" },
  // Evening
  { id: "d5", medId: "metformin", name: "Metformin", strength: "500mg", purpose: "Blood sugar", time: "8:00pm", period: "Evening", status: "upcoming" },
  { id: "d6", medId: "atorvastatin", name: "Atorvastatin", strength: "20mg", purpose: "Cholesterol", time: "8:00pm", period: "Evening", status: "upcoming" },
  // Night
  { id: "d7", medId: "donepezil", name: "Donepezil", strength: "10mg", purpose: "Memory", time: "9:30pm", period: "Night", status: "upcoming" },
];

export const initialPrn: PrnMed[] = [
  { id: "p1", name: "Paracetamol", strength: "500mg", purpose: "Pain & fever", maxPerDay: 4, takenToday: 1, lastTaken: "6:20am" },
  { id: "p2", name: "Lorazepam", strength: "0.5mg", purpose: "Anxiety (as needed)", maxPerDay: 2, takenToday: 0 },
];

export const initialMeds: Medication[] = [
  { id: "lisinopril", name: "Lisinopril", strength: "10mg", form: "Tablet", purpose: "Blood pressure", schedule: "Once daily · 8:00am", prescriber: "Dr. Chen", supplyDays: 24, active: true },
  { id: "metformin", name: "Metformin", strength: "500mg", form: "Tablet", purpose: "Blood sugar", schedule: "Twice daily · 8:00am, 8:00pm", prescriber: "Dr. Chen", supplyDays: 3, active: true },
  { id: "atorvastatin", name: "Atorvastatin", strength: "20mg", form: "Tablet", purpose: "Cholesterol", schedule: "Once daily · 8:00pm", prescriber: "Dr. Patel", supplyDays: 18, active: true },
  { id: "donepezil", name: "Donepezil", strength: "10mg", form: "Tablet", purpose: "Memory", schedule: "Once daily · 9:30pm", prescriber: "Dr. Okafor", supplyDays: 11, active: true },
  { id: "vitamind", name: "Vitamin D", strength: "1000 IU", form: "Capsule", purpose: "Bone health", schedule: "Once daily · 8:00am", prescriber: "Dr. Chen", supplyDays: 40, active: true },
  { id: "aspirin", name: "Aspirin", strength: "81mg", form: "Tablet", purpose: "Heart", schedule: "Once daily · 1:00pm", prescriber: "Dr. Chen", supplyDays: 6, active: true },
  { id: "paracetamol", name: "Paracetamol", strength: "500mg", form: "Tablet", purpose: "Pain & fever (PRN)", schedule: "As needed · max 4/day", prescriber: "Dr. Chen", supplyDays: 30, active: true },
  { id: "amlodipine", name: "Amlodipine", strength: "5mg", form: "Tablet", purpose: "Blood pressure", schedule: "Was once daily", prescriber: "Dr. Chen", supplyDays: 0, active: false, discontinued: true, discontinuedNote: "Stopped Apr 2026 · replaced by Lisinopril" },
  { id: "omeprazole", name: "Omeprazole", strength: "20mg", form: "Capsule", purpose: "Acid reflux", schedule: "Was once daily", prescriber: "Dr. Patel", supplyDays: 0, active: false, discontinued: true, discontinuedNote: "Stopped Jan 2026" },
];
