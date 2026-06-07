// Shared domain types for the Daily Digest screen.

export type MoodKey = "great" | "good" | "okay" | "low";

export type SourceType = "med" | "vital" | "note" | "appointment" | "activity" | "meal";

export interface SourceMoment {
  id: string;
  type: SourceType;
  label: string;
  time: string;
}

export interface ByNumbers {
  medsGiven: number;
  medsTotal: number;
  /** Blood-pressure snapshot, e.g. "128/82". */
  bp: string;
  steps: number;
  mood: MoodKey;
}

export interface Digest {
  /** Days from today (0 = today, negative = past). */
  dayOffset: number;
  headline: string;
  emoji: string;
  mood: MoodKey;
  /** 2–3 short, warm paragraphs. */
  paragraphs: string[];
  numbers: ByNumbers;
  sources: SourceMoment[];
}
