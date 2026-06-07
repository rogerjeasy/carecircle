// Shared domain types for "Ask CareCircle".

export type SourceType = "appointment" | "vital" | "med" | "note" | "timeline";

export interface SourceRef {
  id: string;
  type: SourceType;
  label: string;
  detail: string;
  time: string;
  /** Where clicking the source card goes. */
  href: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: SourceRef[];
}
