// Shared domain types for "Ask CareCircle".

export type SourceType = "appointment" | "vital" | "med" | "note" | "timeline" | "document";

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

/** A saved conversation in the history list. */
export interface ConversationSummary {
  id: string;
  title: string;
  /** ISO timestamp of the last activity (for ordering + relative display). */
  updatedAt: string;
}

/** A conversation with its full message thread (loaded when opened). */
export interface ConversationDetail {
  id: string;
  title: string;
  messages: Message[];
}
