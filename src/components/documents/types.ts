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
  uploadedById: string;
  uploadedAt: Date;
  /** Expiry date if the document has one (insurance, ID, etc.). */
  expiresAt?: Date;
  /** Whether it's flagged onto the emergency card. */
  onEmergencyCard: boolean;
  /** Preview source: an image URL, or null for a synthesized PDF/doc preview. */
  previewUrl?: string;
}

/** Seed shape — `uploadedDaysAgo` / `expiresInDays` resolve to dates relative to "now". */
export interface DocumentSeed extends Omit<DocumentItem, "uploadedAt" | "expiresAt"> {
  uploadedDaysAgo: number;
  expiresInDays?: number;
}
