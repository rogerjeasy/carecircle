// Shared domain types for the Daily Digest.

export type MoodKey = "great" | "good" | "okay" | "low";

export type SourceType = "med" | "vital" | "note" | "appointment" | "activity" | "meal";

export interface SourceMoment {
  id: string;
  type: SourceType;
  label: string;
  /** Human time, e.g. "8:04 AM". */
  time: string;
  /** Where the chip links (defaults to the timeline). */
  href?: string;
}

/** A "by the numbers" stat — flexible so the digest shows whatever real data exists that day. */
export type StatKey =
  | "meds"
  | "bp"
  | "sleep"
  | "glucose"
  | "weight"
  | "hr"
  | "mood"
  | "tasks"
  | "appointments";

export interface DigestStat {
  key: StatKey;
  label: string;
  value: string;
  /** For the mood stat: the face emoji. */
  emoji?: string;
}

export interface Digest {
  /** Persisted row id (for feedback). Empty for an unsaved/preview digest. */
  id: string;
  /** The day this digest covers, as `yyyy-MM-dd`. */
  date: string;
  headline: string;
  emoji: string;
  mood: MoodKey;
  /** 2–3 short, warm paragraphs. */
  paragraphs: string[];
  /** Up to four real stats for the day. */
  stats: DigestStat[];
  sources: SourceMoment[];
}

export type Feedback = "up" | "down" | null;
