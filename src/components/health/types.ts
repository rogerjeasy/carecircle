// Shared domain types for the Health screen.

export type MetricKey = "bp" | "glucose" | "weight" | "sleep" | "mood" | "hr";

export type StatusLevel = "normal" | "elevated" | "low";

export type RangeKey = "7d" | "30d" | "90d";

/** A circle member who can record readings. */
export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
}

/** A single recorded reading. For blood pressure, `value` is systolic and `secondary` diastolic. */
export interface Reading {
  id: string;
  metric: MetricKey;
  at: Date;
  value: number;
  /** Diastolic (blood pressure only). */
  secondary?: number;
  note?: string;
  /** Member id of who recorded it. */
  recordedBy: string;
}

/** Per-metric alert thresholds. Out-of-range readings drive the calm warning state + insights. */
export interface Thresholds {
  enabled: boolean;
  /** Below `min` → low. */
  min: number;
  /** Above `max` → elevated. */
  max: number;
  /** Diastolic min/max (blood pressure only). */
  diaMin?: number;
  diaMax?: number;
}

export type ThresholdMap = Record<MetricKey, Thresholds>;

/** Everything the Health screen needs, assembled server-side and passed in as one prop. */
export interface HealthData {
  /** The active circle these readings belong to — used to remount the screen on circle switch. */
  circleId: string;
  readings: Reading[];
  /** Circle members (for the "recorded by" picker + readings table). */
  members: Member[];
  /** The signed-in user's membership id (default "recorded by"), or null. */
  currentMembershipId: string | null;
  /** The care recipient's first name, for friendly copy (or null). */
  recipientName: string | null;
  /** The circle's persisted alert safe ranges merged over the defaults. */
  thresholds: ThresholdMap;
}

/** Static display config for a metric. */
export interface MetricConfig {
  key: MetricKey;
  name: string;
  /** Short unit shown after the value (empty for mood). */
  unit: string;
  /** CSS colour for charts (an hsl(var(--chart-N)) reference). */
  color: string;
  /** Avatar/icon tint classes for the metric chip. */
  tint: string;
  /** Decimal places when formatting the primary value. */
  decimals: number;
  /** True for metrics with a systolic/diastolic pair. */
  paired?: boolean;
}
