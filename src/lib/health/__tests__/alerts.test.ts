/**
 * Health alert evaluation — pure-logic tests (no AWS, no DB).
 *
 * `logObservation` relies on these semantics to decide when a reading posts as URGENT:
 * stored rows override the defaults, disabled metrics never alert, and bp/mood have
 * special shapes (diastolic pair / min-only).
 */
import { describe, it, expect } from 'vitest';

import { evaluateReading, mergeThresholds, rangeLabel } from '@/lib/health/alerts';
import { DEFAULT_THRESHOLDS } from '@/components/health/data';

describe('mergeThresholds', () => {
  it('returns the defaults when the circle has no stored rows', () => {
    expect(mergeThresholds([])).toEqual(DEFAULT_THRESHOLDS);
  });

  it('stored rows override their metric and leave the rest at defaults', () => {
    const map = mergeThresholds([
      { metric: 'glucose', enabled: true, min: 80, max: 180, diaMin: null, diaMax: null },
    ]);
    expect(map.glucose).toEqual({ enabled: true, min: 80, max: 180 });
    expect(map.bp).toEqual(DEFAULT_THRESHOLDS.bp);
  });

  it('bp falls back to default diastolic bounds when the row has none', () => {
    const map = mergeThresholds([
      { metric: 'bp', enabled: true, min: 100, max: 150, diaMin: null, diaMax: null },
    ]);
    expect(map.bp.diaMin).toBe(DEFAULT_THRESHOLDS.bp.diaMin);
    expect(map.bp.diaMax).toBe(DEFAULT_THRESHOLDS.bp.diaMax);
  });

  it('ignores rows for unknown metrics', () => {
    const map = mergeThresholds([
      { metric: 'spo2', enabled: true, min: 0, max: 1, diaMin: null, diaMax: null },
    ]);
    expect(map).toEqual(DEFAULT_THRESHOLDS);
  });
});

describe('evaluateReading', () => {
  const map = mergeThresholds([]);

  it('flags a high systolic OR a high diastolic blood pressure', () => {
    expect(evaluateReading('bp', 165, 80, map)).toBe('elevated');
    expect(evaluateReading('bp', 120, 95, map)).toBe('elevated');
    expect(evaluateReading('bp', 120, 80, map)).toBe('normal');
    expect(evaluateReading('bp', 85, 55, map)).toBe('low');
  });

  it('mood only alerts on the low side', () => {
    expect(evaluateReading('mood', 2, undefined, map)).toBe('low');
    expect(evaluateReading('mood', 5, undefined, map)).toBe('normal');
  });

  it('a disabled metric never alerts, whatever the value', () => {
    const offMap = mergeThresholds([
      { metric: 'glucose', enabled: false, min: 70, max: 140, diaMin: null, diaMax: null },
    ]);
    expect(evaluateReading('glucose', 500, undefined, offMap)).toBe('normal');
  });

  it('single-value metrics flag above max and below min', () => {
    expect(evaluateReading('hr', 120, undefined, map)).toBe('elevated');
    expect(evaluateReading('hr', 40, undefined, map)).toBe('low');
    expect(evaluateReading('hr', 70, undefined, map)).toBe('normal');
  });
});

describe('rangeLabel', () => {
  it('describes the direction in calm, human words', () => {
    expect(rangeLabel('elevated')).toBe('above the safe range');
    expect(rangeLabel('low')).toBe('below the safe range');
  });
});
