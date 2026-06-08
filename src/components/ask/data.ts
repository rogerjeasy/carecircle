// Static UI bits for Ask CareCircle. Answers + sources now come from the server
// (src/lib/ask/actions.ts → RAG over this circle's record); no dummy knowledge base here.

import { Calendar, FileText, HeartPulse, Pill, FileBox } from "lucide-react";
import type { SourceType } from "./types";

/** Example prompts shown on the empty state (kept generic — the recipient's name is injected). */
export const EXAMPLE_PROMPTS = [
  "When was the last specialist appointment?",
  "Has blood pressure improved this month?",
  "What changed in the medications recently?",
  "What do the latest documents say?",
];

/** Icon per source kind (drives the little badge on a source card). */
export const sourceIcon: Record<SourceType, typeof Pill> = {
  appointment: Calendar,
  vital: HeartPulse,
  med: Pill,
  note: FileText,
  timeline: FileText,
  document: FileBox,
};
