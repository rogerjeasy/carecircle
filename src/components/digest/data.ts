// Demo seed data + display constants for the Daily Digest.

import { Activity, HeartPulse, Pill, Smile } from "lucide-react";
import type { Digest, MoodKey, SourceType } from "./types";

export const CARE_RECIPIENT = { name: "Antonio" } as const;

/** Who the digest is written for + when it's sent (shown in the settings popover). */
export const DIGEST_SETTINGS = {
  recipients: ["Maria", "Paolo"],
  time: "8:00 PM",
  cadence: "Every evening",
} as const;

export const moodMeta: Record<MoodKey, { label: string; emoji: string; tint: string }> = {
  great: { label: "Great", emoji: "😄", tint: "text-success" },
  good: { label: "Good", emoji: "🙂", tint: "text-success" },
  okay: { label: "Okay", emoji: "😐", tint: "text-warning" },
  low: { label: "Low", emoji: "😕", tint: "text-info" },
};

export const sourceIcon: Record<SourceType, typeof Pill> = {
  med: Pill,
  vital: HeartPulse,
  note: Smile,
  appointment: HeartPulse,
  activity: Activity,
  meal: Smile,
};

/** Demo digests keyed by day offset. Days without an entry show the empty state. */
export const DIGESTS: Digest[] = [
  {
    dayOffset: 0,
    headline: "Antonio had a good day",
    emoji: "💚",
    mood: "good",
    paragraphs: [
      "It was a calm, steady day for Antonio. All of his morning medications went down without any fuss, and Grace noted he was in good spirits over breakfast — he even asked for a second cup of coffee.",
      "He had a gentle walk around the garden after lunch and managed about 2,400 steps, a little more than yesterday. His blood pressure was a touch high this morning (128/82) but settled by the afternoon, and he napped well.",
      "Nothing to worry about today. He mentioned missing the grandchildren, so a quick call this evening would likely make his day.",
    ],
    numbers: { medsGiven: 5, medsTotal: 5, bp: "128/82", steps: 2400, mood: "good" },
    sources: [
      { id: "s1", type: "med", label: "Morning meds given", time: "8:04 AM" },
      { id: "s2", type: "vital", label: "Blood pressure 128/82", time: "8:10 AM" },
      { id: "s3", type: "activity", label: "Garden walk", time: "1:30 PM" },
      { id: "s4", type: "note", label: "“Good spirits at breakfast”", time: "8:20 AM" },
    ],
  },
  {
    dayOffset: -1,
    headline: "A quiet, restful day",
    emoji: "🌿",
    mood: "okay",
    paragraphs: [
      "Antonio took things slowly yesterday. He was a little tired in the morning and chose to rest rather than walk, which is completely fine — he'd had a busy week.",
      "All medications were given on time, and he ate well at dinner (a favourite: minestrone). His mood lifted in the evening when Paolo dropped by to watch the football with him.",
    ],
    numbers: { medsGiven: 5, medsTotal: 5, bp: "124/80", steps: 900, mood: "okay" },
    sources: [
      { id: "s1", type: "med", label: "Evening meds given", time: "8:02 PM" },
      { id: "s2", type: "meal", label: "Ate well at dinner", time: "6:30 PM" },
      { id: "s3", type: "note", label: "Paolo visited", time: "7:45 PM" },
    ],
  },
  {
    dayOffset: -2,
    headline: "A bright, sociable day",
    emoji: "☀️",
    mood: "great",
    paragraphs: [
      "What a lovely day Antonio had. He was chatty and energetic from the morning, and his cardiology check-up went well — Dr. Chen was pleased with his progress and kept his medications the same.",
      "He walked the most he has all week (3,100 steps) and enjoyed a long phone call with Lucia in the afternoon. He went to bed happy and slept soundly.",
    ],
    numbers: { medsGiven: 5, medsTotal: 5, bp: "122/78", steps: 3100, mood: "great" },
    sources: [
      { id: "s1", type: "appointment", label: "Cardiology check-up", time: "10:30 AM" },
      { id: "s2", type: "activity", label: "3,100 steps", time: "All day" },
      { id: "s3", type: "note", label: "Call with Lucia", time: "3:00 PM" },
    ],
  },
  {
    dayOffset: -3,
    headline: "A day that needed a little extra care",
    emoji: "🤍",
    mood: "low",
    paragraphs: [
      "Antonio was a bit under the weather yesterday — quieter than usual and not very hungry at lunch. Grace kept a close eye on him and made sure he stayed hydrated.",
      "His afternoon medication was given about an hour late as he was napping, but everything else was on schedule. By the evening he was perking up and asked to sit by the window. Worth a gentle check-in today.",
    ],
    numbers: { medsGiven: 4, medsTotal: 5, bp: "131/85", steps: 600, mood: "low" },
    sources: [
      { id: "s1", type: "med", label: "Afternoon dose (late)", time: "2:50 PM" },
      { id: "s2", type: "note", label: "“Quieter than usual”", time: "12:15 PM" },
      { id: "s3", type: "vital", label: "Blood pressure 131/85", time: "9:00 AM" },
    ],
  },
];

export function digestForOffset(offset: number): Digest | undefined {
  return DIGESTS.find((d) => d.dayOffset === offset);
}
