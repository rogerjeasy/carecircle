/**
 * Pure notification-preference gating — the single source of truth for "should this member get
 * THIS notification, of THIS type, on THIS channel, right now?".
 *
 * No DB, no I/O: callers load a member's preferences (and timezone) and ask these helpers. Shared by
 * the outbound dispatcher (email + Web Push) and the in-app feed filter so all three channels obey
 * the same matrix×quiet-hours rules. Keeping it pure makes it unit-testable and impossible to drift.
 *
 * Rules:
 *   • Matrix gate always applies — a channel a member switched OFF for a type is never used.
 *   • Quiet hours pause only NON-URGENT notifications; urgent (e.g. a high-severity incident)
 *     always comes through, matching the Settings copy.
 */
import { DEFAULT_MATRIX, type ChannelKey, type NotifMatrix, type NotifTypeKey } from '@/components/settings/data';

export type { ChannelKey, NotifMatrix, NotifTypeKey } from '@/components/settings/data';

export interface QuietHours {
  enabled: boolean;
  /** "HH:MM" 24h, inclusive start of the quiet window. */
  from: string;
  /** "HH:MM" 24h, exclusive end of the quiet window (may be earlier than `from` → wraps midnight). */
  to: string;
}

export interface NotificationPrefs {
  matrix: NotifMatrix;
  quiet: QuietHours;
}

/** The product default quiet window (9pm–7am), used until a member saves their own. */
export const DEFAULT_QUIET: QuietHours = { enabled: true, from: '21:00', to: '07:00' };

/** Current wall-clock "HH:MM" in `timeZone` (falls back to UTC for an unknown/blank zone). */
function localHHMM(now: Date, timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    let hh = get('hour');
    if (hh === '24') hh = '00'; // some engines emit "24" for midnight
    return `${hh}:${get('minute')}`;
  } catch {
    return now.toISOString().slice(11, 16); // UTC HH:MM
  }
}

/**
 * Is `now` within the member's quiet window? Handles a window that wraps midnight
 * (e.g. 21:00 → 07:00). A zero-length window (from === to) is treated as "never quiet".
 */
export function isInQuietHours(quiet: QuietHours | undefined, now: Date, timeZone?: string): boolean {
  if (!quiet?.enabled) return false;
  const { from, to } = quiet;
  if (from === to) return false;
  const cur = localHHMM(now, timeZone); // zero-padded "HH:MM" → lexical compare matches chronological
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

/** Whether a member has the given type×channel switched on (falling back to the product defaults). */
export function channelEnabled(prefs: NotificationPrefs, type: NotifTypeKey, channel: ChannelKey): boolean {
  const row = prefs.matrix?.[type] ?? DEFAULT_MATRIX[type];
  return row?.[channel] ?? DEFAULT_MATRIX[type]?.[channel] ?? false;
}

export interface DeliverDecision {
  prefs: NotificationPrefs;
  type: NotifTypeKey;
  channel: ChannelKey;
  /** Urgent notifications bypass quiet hours (but still respect the matrix toggle). */
  urgent: boolean;
  /** The instant to evaluate quiet hours against — send time for outbound, event time for the feed. */
  now: Date;
  /** The member's timezone (e.g. "Europe/Lisbon"); UTC if unknown. */
  timeZone?: string;
}

/** The one decision every channel asks: deliver this notification to this member on this channel? */
export function shouldDeliver({ prefs, type, channel, urgent, now, timeZone }: DeliverDecision): boolean {
  if (!channelEnabled(prefs, type, channel)) return false;
  if (urgent) return true;
  return !isInQuietHours(prefs.quiet, now, timeZone);
}

/** Merge a possibly-partial stored blob over the product defaults → always a complete prefs object. */
export function withDefaults(
  stored?: {
    matrix?: Record<string, Record<string, boolean>> | null;
    quiet?: Partial<QuietHours> | null;
  } | null,
): NotificationPrefs {
  return {
    matrix: { ...DEFAULT_MATRIX, ...(stored?.matrix as NotifMatrix | undefined) },
    quiet: { ...DEFAULT_QUIET, ...(stored?.quiet ?? {}) },
  };
}
