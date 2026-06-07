// Shared demo data for the role-specific experiences (caregiver, recipient, read-only, clinician).

export const RECIPIENT = {
  name: "Antonio",
  fullName: "Antonio Rodriguez",
  age: 78,
  dob: "12 March 1948",
  bloodType: "O+",
};

export const CONDITIONS = ["Hypertension", "Type 2 diabetes", "Mild cognitive impairment"];
export const ALLERGIES = ["Penicillin", "Shellfish"];

export const EMERGENCY_CONTACTS = [
  { name: "Maria Rodriguez", relation: "Daughter · primary contact", phone: "+1 (555) 204-1180" },
  { name: "Carlos Rodriguez", relation: "Son", phone: "+1 (555) 204-2290" },
  { name: "Dr. Chen", relation: "Cardiologist", phone: "+1 (555) 010-2030" },
];

export interface Dose {
  id: string;
  name: string;
  strength: string;
  time: string;
  purpose: string;
  given: boolean;
}

export const TODAY_DOSES: Dose[] = [
  { id: "d1", name: "Lisinopril", strength: "10mg", time: "8:00 AM", purpose: "Blood pressure", given: true },
  { id: "d2", name: "Metformin", strength: "500mg", time: "8:00 AM", purpose: "Blood sugar", given: true },
  { id: "d3", name: "Aspirin", strength: "81mg", time: "1:00 PM", purpose: "Heart", given: false },
  { id: "d4", name: "Metformin", strength: "500mg", time: "8:00 PM", purpose: "Blood sugar", given: false },
  { id: "d5", name: "Atorvastatin", strength: "20mg", time: "8:00 PM", purpose: "Cholesterol", given: false },
];

export interface ShiftTask {
  id: string;
  title: string;
  done: boolean;
}

export const TODAY_TASKS: ShiftTask[] = [
  { id: "t1", title: "Help Antonio with morning wash", done: true },
  { id: "t2", title: "Prepare a low-salt lunch", done: false },
  { id: "t3", title: "Afternoon walk in the garden", done: false },
  { id: "t4", title: "Record blood pressure", done: false },
];

export const TODAY_APPTS = [
  { title: "Physiotherapy", provider: "James Wood, PT", time: "9:00 AM", location: "Home visit" },
  { title: "Cardiology follow-up", provider: "Dr. Chen", time: "Tomorrow, 10:30 AM", location: "City Heart Clinic" },
];

/** Current medications with simple adherence percentages (clinician view). */
export const CURRENT_MEDS = [
  { name: "Lisinopril", strength: "10mg", schedule: "Once daily", adherence: 98 },
  { name: "Metformin", strength: "500mg", schedule: "Twice daily", adherence: 92 },
  { name: "Atorvastatin", strength: "20mg", schedule: "Once daily, evening", adherence: 95 },
  { name: "Aspirin", strength: "81mg", schedule: "Once daily", adherence: 88 },
  { name: "Donepezil", strength: "10mg", schedule: "Once daily, night", adherence: 90 },
];

/** Blood-pressure trend for the clinician chart. */
export const BP_TREND = [
  { label: "Mon", sys: 132, dia: 86 },
  { label: "Tue", sys: 130, dia: 84 },
  { label: "Wed", sys: 128, dia: 83 },
  { label: "Thu", sys: 134, dia: 88 },
  { label: "Fri", sys: 129, dia: 82 },
  { label: "Sat", sys: 127, dia: 81 },
  { label: "Sun", sys: 128, dia: 82 },
];

export const GLUCOSE_TREND = [
  { label: "Mon", v: 118 },
  { label: "Tue", v: 124 },
  { label: "Wed", v: 109 },
  { label: "Thu", v: 132 },
  { label: "Fri", v: 115 },
  { label: "Sat", v: 121 },
  { label: "Sun", v: 112 },
];

export const RECENT_INCIDENTS = [
  { type: "Fall", severity: "Medium", when: "Today, 7:40 AM", summary: "Stumbled getting out of bed; no injury. Monitoring." },
  { type: "Hospitalization", severity: "High", when: "May 4", summary: "Chest tightness; observed and discharged same day." },
];

export const MEDICAL_DOCS = [
  { title: "Cardiology discharge summary", kind: "PDF", date: "Jun 4, 2026" },
  { title: "Medication list (current)", kind: "PDF", date: "Jun 6, 2026" },
  { title: "Recent blood panel", kind: "PDF", date: "May 28, 2026" },
  { title: "ECG report", kind: "Image", date: "May 4, 2026" },
];

/** A small read-only timeline feed for the relative experience. */
export interface FeedEvent {
  id: string;
  kind: "med" | "vital" | "note" | "appointment";
  summary: string;
  detail?: string;
  author: { name: string; initials: string; color: string };
  time: string;
  hearts: number;
  reacted: boolean;
}

export const FEED: FeedEvent[] = [
  { id: "f1", kind: "med", summary: "Grace gave Antonio's morning medications", detail: "All taken with breakfast. He was in good spirits.", author: { name: "Grace", initials: "GM", color: "bg-primary/10 text-primary" }, time: "2 hours ago", hearts: 2, reacted: false },
  { id: "f2", kind: "vital", summary: "Blood pressure logged: 128/82", detail: "Settled nicely after his morning walk.", author: { name: "Grace", initials: "GM", color: "bg-primary/10 text-primary" }, time: "3 hours ago", hearts: 1, reacted: true },
  { id: "f3", kind: "note", summary: "“He enjoyed the call with the grandchildren”", author: { name: "Maria", initials: "MR", color: "bg-accent/10 text-accent" }, time: "5 hours ago", hearts: 4, reacted: false },
  { id: "f4", kind: "appointment", summary: "Physiotherapy completed", detail: "Good progress on balance exercises.", author: { name: "Paolo", initials: "PB", color: "bg-info/10 text-info" }, time: "Yesterday", hearts: 2, reacted: false },
];
