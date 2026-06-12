// Shared domain types for the Timeline.

export type EventType = "med" | "vital" | "note" | "appointment" | "incident";
export type Visibility = "everyone" | "family" | "private";

export interface TimelineComment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  timestamp: Date;
}

export interface TimelineEvent {
  id: string;
  type: EventType;
  summary: string;
  details?: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  timestamp: Date;
  photoUrl?: string;
  visibility: Visibility;
  isUrgent?: boolean;
  comments: TimelineComment[];
  reactions: { userId: string; type: "heart" }[];
}

/** Everything the Timeline screen needs, assembled server-side and passed in as one prop. */
export interface TimelineData {
  /** The active circle this feed belongs to — used to remount the screen on circle switch. */
  circleId: string;
  /** The care recipient's real first name (composer placeholder); null when no profile exists. */
  recipientName: string | null;
  events: TimelineEvent[];
  /** Whether older events remain beyond the loaded page (drives "Load earlier updates"). */
  hasMore: boolean;
}
