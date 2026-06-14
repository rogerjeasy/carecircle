/** Shared types for global (top-bar) search. */

export type SearchResultType =
  | 'person'
  | 'recipient'
  | 'medication'
  | 'document'
  | 'task'
  | 'appointment'
  | 'timeline'
  | 'incident';

export interface SearchResult {
  /** Stable id (entity row id) — used as the React key, not for authz. */
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  /** Where selecting the result navigates. */
  href: string;
}

export interface SearchResponse {
  results: SearchResult[];
}
