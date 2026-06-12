/**
 * safeInternalPath — the open-redirect guard for every post-auth `?callbackUrl=` redirect
 * (sign-in, social sign-in, invite round-trips). Pure tests, no AWS, no DB.
 */
import { describe, it, expect } from 'vitest';

import { safeInternalPath } from '@/lib/utils';

describe('safeInternalPath', () => {
  it('accepts same-origin relative paths (the only thing the proxy ever sets)', () => {
    expect(safeInternalPath('/dashboard')).toBe('/dashboard');
    expect(safeInternalPath('/invite/abc123')).toBe('/invite/abc123');
    expect(safeInternalPath('/invite/abc?from=email#cta')).toBe('/invite/abc?from=email#cta');
    expect(safeInternalPath('  /dashboard  ')).toBe('/dashboard');
  });

  it.each([
    ['absolute http URL', 'https://evil.example/phish'],
    ['protocol-relative URL', '//evil.example'],
    ['backslash protocol-relative trick', '/\\evil.example'],
    ['backslash later in the path (browser normalizes \\ to /)', '/foo\\..\\bar'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['missing leading slash', 'dashboard'],
    ['scheme-ish relative', 'http:/evil.example'],
  ])('rejects %s', (_label, input) => {
    expect(safeInternalPath(input)).toBeNull();
  });

  it('returns null for empty input so callers fall back to their default landing page', () => {
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
    expect(safeInternalPath('')).toBeNull();
    expect(safeInternalPath('   ')).toBeNull();
  });
});
