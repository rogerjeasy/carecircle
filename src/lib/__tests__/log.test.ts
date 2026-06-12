/**
 * Logging hygiene helpers — pure tests (no AWS, no DB). maskEmail is the project's PII guard for
 * every log line; dbErrorCode walks Drizzle's wrapped causes; serverLog routes failures to stderr.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { maskEmail, dbErrorCode, serverLog } from '@/lib/log';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('maskEmail', () => {
  it('keeps only the domain', () => {
    expect(maskEmail('rosa@example.com')).toBe('***@example.com');
  });

  it('handles missing / malformed input without leaking it', () => {
    expect(maskEmail(undefined)).toBe('unknown');
    expect(maskEmail(null)).toBe('unknown');
    expect(maskEmail('')).toBe('unknown');
    expect(maskEmail('not-an-email')).toBe('invalid');
    expect(maskEmail('@nodomain.com')).toBe('invalid'); // no local part
  });
});

describe('dbErrorCode', () => {
  it('reads a code directly off the error', () => {
    expect(dbErrorCode({ code: '42501' })).toBe('42501');
  });

  it('walks nested causes (Drizzle wraps the Postgres error)', () => {
    const err = new Error('query failed');
    (err as Error & { cause: unknown }).cause = { cause: { code: '42P01' } };
    expect(dbErrorCode(err)).toBe('42P01');
  });

  it('returns undefined when there is no code anywhere', () => {
    expect(dbErrorCode(new Error('plain'))).toBeUndefined();
    expect(dbErrorCode(undefined)).toBeUndefined();
  });
});

describe('serverLog', () => {
  it('sends failures to console.error and the rest to console.info', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    serverLog('auth', 'signIn', 'failure', { reason: 'bad_credentials' });
    serverLog('auth', 'signIn', 'success');

    expect(error).toHaveBeenCalledWith('[auth] signIn failure reason=bad_credentials');
    expect(info).toHaveBeenCalledWith('[auth] signIn success');
  });

  it('drops empty meta values and collapses whitespace in strings (one greppable line)', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    serverLog('email', 'deliver', 'success', {
      provider: 'ses',
      to: '***@example.com',
      note: 'two words',
      skipped: undefined,
      empty: '',
      count: 0,
      flag: false,
    });

    expect(info).toHaveBeenCalledWith(
      '[email] deliver success provider=ses to=***@example.com note=two_words count=0 flag=false',
    );
  });
});
