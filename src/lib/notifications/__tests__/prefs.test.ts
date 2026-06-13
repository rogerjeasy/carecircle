/**
 * Pure tests for the notification gating rules (no DB, no AWS). These are the rules every channel
 * obeys: matrix toggle gates always, quiet hours pause only non-urgent, and the quiet window can
 * wrap midnight and is evaluated in the member's own timezone.
 */
import { describe, it, expect } from 'vitest';
import {
  isInQuietHours,
  channelEnabled,
  shouldDeliver,
  withDefaults,
  type NotificationPrefs,
} from '@/lib/notifications/prefs';

const prefs = (over?: Partial<NotificationPrefs>): NotificationPrefs =>
  withDefaults({
    matrix: {
      meds: { inApp: true, email: true, push: true },
      vitals: { inApp: true, email: false, push: false },
      tasks: { inApp: true, email: true, push: false },
      incidents: { inApp: true, email: true, push: true },
      digest: { inApp: true, email: true, push: false },
    },
    quiet: { enabled: true, from: '21:00', to: '07:00' },
    ...over,
  });

// A fixed instant we can reason about in UTC: 2026-06-13T23:30:00Z (23:30 UTC).
const lateNightUtc = new Date('2026-06-13T23:30:00Z');
const middayUtc = new Date('2026-06-13T12:00:00Z');

describe('isInQuietHours', () => {
  it('is false when quiet hours are disabled', () => {
    expect(isInQuietHours({ enabled: false, from: '21:00', to: '07:00' }, lateNightUtc, 'UTC')).toBe(false);
  });

  it('detects a time inside an overnight (wrapping) window', () => {
    expect(isInQuietHours({ enabled: true, from: '21:00', to: '07:00' }, lateNightUtc, 'UTC')).toBe(true); // 23:30
    expect(isInQuietHours({ enabled: true, from: '21:00', to: '07:00' }, middayUtc, 'UTC')).toBe(false); // 12:00
  });

  it('detects a time inside a same-day window', () => {
    expect(isInQuietHours({ enabled: true, from: '09:00', to: '17:00' }, middayUtc, 'UTC')).toBe(true);
    expect(isInQuietHours({ enabled: true, from: '09:00', to: '17:00' }, lateNightUtc, 'UTC')).toBe(false);
  });

  it('treats a zero-length window as never quiet', () => {
    expect(isInQuietHours({ enabled: true, from: '08:00', to: '08:00' }, middayUtc, 'UTC')).toBe(false);
  });

  it('evaluates in the member timezone, not UTC', () => {
    // 23:30 UTC is 19:30 in New York (UTC-4 in June) → outside a 21:00–07:00 window there.
    expect(isInQuietHours({ enabled: true, from: '21:00', to: '07:00' }, lateNightUtc, 'America/New_York')).toBe(false);
  });
});

describe('channelEnabled', () => {
  it('reads the stored matrix', () => {
    expect(channelEnabled(prefs(), 'vitals', 'email')).toBe(false);
    expect(channelEnabled(prefs(), 'meds', 'push')).toBe(true);
  });
});

describe('shouldDeliver', () => {
  it('blocks a channel the member turned off, even outside quiet hours', () => {
    expect(shouldDeliver({ prefs: prefs(), type: 'vitals', channel: 'email', urgent: false, now: middayUtc, timeZone: 'UTC' })).toBe(false);
  });

  it('delivers an enabled channel outside quiet hours', () => {
    expect(shouldDeliver({ prefs: prefs(), type: 'meds', channel: 'email', urgent: false, now: middayUtc, timeZone: 'UTC' })).toBe(true);
  });

  it('pauses a non-urgent notification during quiet hours', () => {
    expect(shouldDeliver({ prefs: prefs(), type: 'meds', channel: 'push', urgent: false, now: lateNightUtc, timeZone: 'UTC' })).toBe(false);
  });

  it('lets an urgent notification through quiet hours (matrix still on)', () => {
    expect(shouldDeliver({ prefs: prefs(), type: 'incidents', channel: 'push', urgent: true, now: lateNightUtc, timeZone: 'UTC' })).toBe(true);
  });

  it('still blocks an urgent notification on a channel the member turned off', () => {
    const off = prefs({ matrix: { ...prefs().matrix, incidents: { inApp: true, email: false, push: false } } });
    expect(shouldDeliver({ prefs: off, type: 'incidents', channel: 'push', urgent: true, now: lateNightUtc, timeZone: 'UTC' })).toBe(false);
  });
});
