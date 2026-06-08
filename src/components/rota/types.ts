// Shared domain types for the Care Rota screen.

export type ShiftType = "in-person" | "on-call";

/** A circle member who can take shifts. */
export interface Member {
  id: string;
  name: string;
  initials: string;
  /** Avatar tint classes, e.g. "bg-primary/10 text-primary". */
  color: string;
  /** Shift-block classes (bg + border + text), e.g. "bg-primary/10 border-primary/30 text-primary". */
  block: string;
}

export interface Shift {
  id: string;
  memberId: string;
  /** Day of week, 0 = Sunday … 6 = Saturday (matches JS Date.getDay()). */
  dayIndex: number;
  /** "HH:mm" 24h local start. */
  start: string;
  /** "HH:mm" 24h local end (if <= start, the shift runs overnight into the next day). */
  end: string;
  type: ShiftType;
}

/** Everything the Care Rota screen needs, assembled server-side and passed in as one prop. */
export interface RotaData {
  /** The active circle — used to remount the screen on circle switch. */
  circleId: string;
  shifts: Shift[];
  /** Circle members who can take shifts (with avatar + block colours). */
  members: Member[];
}
