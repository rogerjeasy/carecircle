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
