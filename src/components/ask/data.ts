// Static UI bits for Ask Kintwadi. Answers + sources now come from the server
// (src/lib/ask/actions.ts → RAG over this circle's record); no dummy knowledge base here.

import { Calendar, FileText, HeartPulse, Pill, FileBox } from "lucide-react";
import type { SourceType } from "./types";

/** Icon per source kind (drives the little badge on a source card). */
export const sourceIcon: Record<SourceType, typeof Pill> = {
  appointment: Calendar,
  vital: HeartPulse,
  med: Pill,
  note: FileText,
  timeline: FileText,
  document: FileBox,
};
