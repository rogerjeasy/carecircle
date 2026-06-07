// Demo "knowledge base" + example prompts for Ask CareCircle.
// (A stand-in for semantic search over THIS circle's record — answers are grounded in sources.)

import { Calendar, FileText, HeartPulse, Pill } from "lucide-react";
import type { SourceRef, SourceType } from "./types";

export const CARE_RECIPIENT = { name: "Antonio" } as const;

export const EXAMPLE_PROMPTS = [
  "When did Antonio last see the cardiologist?",
  "Has his blood pressure improved this month?",
  "What changed in his medications?",
  "How has he been sleeping lately?",
];

export const sourceIcon: Record<SourceType, typeof Pill> = {
  appointment: Calendar,
  vital: HeartPulse,
  med: Pill,
  note: FileText,
  timeline: FileText,
};

interface KbEntry {
  keywords: string[];
  answer: string;
  sources: SourceRef[];
}

const KB: KbEntry[] = [
  {
    keywords: ["cardiolog", "heart", "dr chen", "chen"],
    answer:
      "Antonio last saw Dr. Chen (cardiology) two days ago. The visit went well — his heart function was stable and Dr. Chen kept his medications the same, with a follow-up suggested in three months.",
    sources: [
      { id: "a1", type: "appointment", label: "Cardiology check-up", detail: "Dr. Chen · City Heart Clinic", time: "2 days ago", href: "/appointments" },
      { id: "a2", type: "timeline", label: "“Cardiologist visit completed”", detail: "Posted by Maria", time: "2 days ago", href: "/timeline" },
    ],
  },
  {
    keywords: ["blood pressure", "bp", "pressure", "improv"],
    answer:
      "His blood pressure has been gradually improving. Over the last 30 days the morning average came down from about 132/86 to 126/82. That said, it was a touch elevated on 5 of the last 7 mornings, so it's worth keeping a gentle eye on it.",
    sources: [
      { id: "b1", type: "vital", label: "Blood pressure trend", detail: "30-day average 126/82", time: "This month", href: "/health" },
      { id: "b2", type: "vital", label: "Latest reading 128/82", detail: "Logged by Grace", time: "Today", href: "/health" },
    ],
  },
  {
    keywords: ["medication", "meds", "medicine", "changed", "change", "prescri"],
    answer:
      "There haven't been any medication changes in the last few weeks. The most recent change was about a month ago, when Lisinopril 10mg was started after his cardiology consult. Everything else has stayed the same.",
    sources: [
      { id: "m1", type: "med", label: "Lisinopril 10mg started", detail: "After cardiology consult", time: "~4 weeks ago", href: "/medications" },
      { id: "m2", type: "timeline", label: "Medication list updated", detail: "Posted by Maria", time: "1 day ago", href: "/timeline" },
    ],
  },
  {
    keywords: ["sleep", "sleeping", "rest", "night"],
    answer:
      "Antonio has been sleeping fairly well — averaging around 7 hours a night over the past week, with one shorter night midweek. Grace noted he's been settling more easily since the new pillow arrangement.",
    sources: [
      { id: "s1", type: "vital", label: "Sleep ~7h average", detail: "Past 7 days", href: "/health", time: "This week" },
      { id: "s2", type: "note", label: "“Slept well last night”", detail: "Note from Maria", time: "4 days ago", href: "/timeline" },
    ],
  },
];

const FALLBACK = {
  answer:
    "I searched Antonio's care record but couldn't find a confident answer to that. Try asking about his recent appointments, blood pressure, medications, or how he's been sleeping.",
  sources: [] as SourceRef[],
};

/** Naive keyword match standing in for semantic search over the circle's record. */
export function findAnswer(question: string): { answer: string; sources: SourceRef[] } {
  const q = question.toLowerCase();
  const hit = KB.find((e) => e.keywords.some((k) => q.includes(k)));
  return hit ? { answer: hit.answer, sources: hit.sources } : FALLBACK;
}
