/**
 * Deliverability classification — the gate that keeps the app from ever trying to email a seeded
 * demo address (or any syntactically invalid one). Pure function, no mocks needed.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyEmailDeliverability,
  isDeliverableEmail,
  undeliverableReasonLabel,
} from '../email-address';

describe('classifyEmailDeliverability', () => {
  it('treats the seeded .demo addresses as undeliverable (demo_address)', () => {
    for (const addr of [
      'maria@kintwadi.demo',
      'guest-abc123@guest.kintwadi.demo',
      'Tomas@Kintwadi.DEMO', // case-insensitive on the domain
    ]) {
      expect(classifyEmailDeliverability(addr)).toEqual({ deliverable: false, reason: 'demo_address' });
      expect(isDeliverableEmail(addr)).toBe(false);
    }
  });

  it('treats IETF-reserved TLDs as undeliverable (reserved_tld)', () => {
    for (const addr of ['a@host.test', 'b@foo.invalid', 'c@bar.localhost', 'd@x.local']) {
      expect(classifyEmailDeliverability(addr)).toEqual({ deliverable: false, reason: 'reserved_tld' });
    }
  });

  it('rejects syntactically invalid addresses (invalid_format)', () => {
    for (const addr of ['', '   ', 'not-an-email', 'no@tld', 'two@@at.com', 'spaces in@x.com', null, undefined]) {
      expect(classifyEmailDeliverability(addr)).toEqual({ deliverable: false, reason: 'invalid_format' });
    }
  });

  it('passes real, routable addresses (including example.com, whose TLD is com)', () => {
    for (const addr of ['user@example.com', 'a.b+tag@mail.co.uk', 'rogerjeasy@gmail.com']) {
      expect(classifyEmailDeliverability(addr)).toEqual({ deliverable: true });
      expect(isDeliverableEmail(addr)).toBe(true);
    }
  });

  it('does NOT confuse a reserved label that is not the TLD', () => {
    // `demo.com` / `test.org` end in a real TLD — only the FINAL label is checked.
    expect(isDeliverableEmail('x@demo.com')).toBe(true);
    expect(isDeliverableEmail('x@test.org')).toBe(true);
  });

  it('labels every reason', () => {
    expect(undeliverableReasonLabel('demo_address')).toMatch(/demo/i);
    expect(undeliverableReasonLabel('reserved_tld')).toMatch(/reserved/i);
    expect(undeliverableReasonLabel('invalid_format')).toMatch(/invalid/i);
  });
});
