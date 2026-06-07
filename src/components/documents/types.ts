// Shared domain types for the Documents vault.

export type DocCategory =
  | "medical"
  | "insurance"
  | "legal"
  | "financial"
  | "id"
  | "advance-directive";

/** Sensitivity tier — drives the lock indicator and RBAC visibility. */
export type Sensitivity = "standard" | "sensitive" | "restricted";

export type FileKind = "pdf" | "image" | "doc";

/** A circle member (uploader / viewer). */
export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: DocCategory;
  sensitivity: Sensitivity;
  kind: FileKind;
  /** Human-readable size, e.g. "1.2 MB". */
  size: string;
  /** The uploader's user id. */
  uploadedById: string;
  /** Uploader display fields, resolved server-side (no client member lookup needed). */
  uploaderName: string;
  uploaderInitials: string;
  uploaderColor: string;
  uploadedAt: Date;
  /** Expiry date if the document has one (insurance, ID, etc.). */
  expiresAt?: Date;
  /** Whether it's flagged onto the emergency card. */
  onEmergencyCard: boolean;
  /** Preview source: a (presigned) image URL for image docs; absent for PDFs/docs. */
  previewUrl?: string;
  /** Short-lived presigned URL to open/download the file (all kinds). */
  downloadUrl?: string;
}

/** Everything the Documents screen needs, assembled server-side and passed in as one prop. */
export interface DocumentsData {
  /** The active circle this vault belongs to — used to remount the screen on circle switch. */
  circleId: string;
  documents: DocumentItem[];
}
