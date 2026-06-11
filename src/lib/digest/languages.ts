/**
 * Digest languages — the diaspora feature's registry. Shared by client (pickers, toggle labels)
 * and server (translation prompt), so NO server-only imports here.
 *
 * Kintwadi's families span continents: the aide in Manila, the daughter in Toronto, the son in
 * Dubai. Each member chooses the language THEY read the Daily Digest in; translations are written
 * by Claude on Bedrock once per language per day and cached on the digest row.
 */
export interface DigestLanguage {
  /** BCP-47 primary subtag stored in membership.preferred_language. */
  code: string;
  /** English name (for pickers). */
  label: string;
  /** Native name (what the toggle shows — "Basahin sa Tagalog"). */
  nativeLabel: string;
}

export const ENGLISH_CODE = 'en';

export const DIGEST_LANGUAGES: DigestLanguage[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'tl', label: 'Tagalog', nativeLabel: 'Tagalog' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'zh', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
];

const BY_CODE = new Map(DIGEST_LANGUAGES.map((l) => [l.code, l]));

export function isSupportedLanguage(code: unknown): code is string {
  return typeof code === 'string' && BY_CODE.has(code);
}

export function languageFor(code: string | null | undefined): DigestLanguage | null {
  if (!code) return null;
  return BY_CODE.get(code) ?? null;
}
