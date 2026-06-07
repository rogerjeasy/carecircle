// Shared types for the dashboard.

export type DayStatus = "good" | "okay" | "attention" | "unknown";

export interface WeekDay {
  day: string;
  status: DayStatus;
  label: string;
}
