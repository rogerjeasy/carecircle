/**
 * Care-scans decision logic — pure tests for the decline-streak rule (no AWS, no DB).
 * The sweep posts an urgent alert only when the most recent N dated statuses are consecutive
 * calendar days AND all out of range in the same direction.
 */
import { describe, it, expect } from 'vitest';

import { findDeclineStreak } from '@/lib/scans/cron';

describe('findDeclineStreak', () => {
  it('detects three consecutive elevated days (order-independent input)', () => {
    expect(
      findDeclineStreak([
        { date: '2026-06-08', status: 'elevated' },
        { date: '2026-06-10', status: 'elevated' },
        { date: '2026-06-09', status: 'elevated' },
      ]),
    ).toBe('elevated');
  });

  it('detects a low streak too', () => {
    expect(
      findDeclineStreak([
        { date: '2026-06-08', status: 'low' },
        { date: '2026-06-09', status: 'low' },
        { date: '2026-06-10', status: 'low' },
      ]),
    ).toBe('low');
  });

  it('returns null when any of the recent days is back in range', () => {
    expect(
      findDeclineStreak([
        { date: '2026-06-08', status: 'elevated' },
        { date: '2026-06-09', status: 'normal' },
        { date: '2026-06-10', status: 'elevated' },
      ]),
    ).toBeNull();
  });

  it('returns null when the days are not consecutive (a gap breaks the streak)', () => {
    expect(
      findDeclineStreak([
        { date: '2026-06-06', status: 'elevated' },
        { date: '2026-06-07', status: 'elevated' },
        { date: '2026-06-10', status: 'elevated' },
      ]),
    ).toBeNull();
  });

  it('returns null when directions are mixed — that is volatility, not decline', () => {
    expect(
      findDeclineStreak([
        { date: '2026-06-08', status: 'low' },
        { date: '2026-06-09', status: 'elevated' },
        { date: '2026-06-10', status: 'elevated' },
      ]),
    ).toBeNull();
  });

  it('returns null with fewer days than the streak requires', () => {
    expect(
      findDeclineStreak([
        { date: '2026-06-09', status: 'elevated' },
        { date: '2026-06-10', status: 'elevated' },
      ]),
    ).toBeNull();
  });

  it('only the most recent N days matter — an old normal day does not block the streak', () => {
    expect(
      findDeclineStreak([
        { date: '2026-06-06', status: 'normal' },
        { date: '2026-06-08', status: 'elevated' },
        { date: '2026-06-09', status: 'elevated' },
        { date: '2026-06-10', status: 'elevated' },
      ]),
    ).toBe('elevated');
  });
});
