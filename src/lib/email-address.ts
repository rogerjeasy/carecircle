/**
 * Email-address deliverability classification — the gate that stops the app from ever trying to
 * send mail to an address that physically cannot receive it.
 *
 * Why this exists: the seeded demo data uses placeholder addresses under the reserved `.demo` TLD
 * (e.g. `maria@kintwadi.demo`, `guest-…@guest.kintwadi.demo`). Those mailboxes don't exist, so a
 * real send just bounces (or, worse, harms our sending reputation). More broadly, RFC 2606 / 6761
 * reserve `.test`, `.example`, `.invalid` and `.localhost` precisely so they never resolve to a real
 * mailbox. We treat all of these — plus anything that isn't a syntactically valid address — as
 * UNDELIVERABLE: callers skip the send and surface an in-app notice instead (see `deliver()` in
 * src/lib/email.ts and the notification dispatcher). Valid, real addresses are unaffected.
 *
 * Pure + framework-free (no 'server-only'): the same rule classifies addresses in server sends and
 * in unit tests, and could back a client-side form hint later.
 */

export type UndeliverableReason = 'invalid_format' | 'demo_address' | 'reserved_tld';

export type EmailDeliverability =
  | { deliverable: true }
  | { deliverable: false; reason: UndeliverableReason };

/**
 * Non-routable top-level domains. `demo` is our seed-data convention; the rest are the IETF-reserved
 * TLDs (RFC 2606 / RFC 6761), plus `local` (mDNS), that are guaranteed never to reach a real mail
 * server. Matched on the final label only, lower-cased.
 */
const RESERVED_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local']);

/**
 * Conservative address shape: a non-empty local part with no spaces, one `@`, then a domain of at
 * least two dot-separated labels (so `user@host` with no TLD is rejected too). This is a
 * deliverability pre-check, not full RFC 5322 validation — it only has to catch obviously unsendable
 * input; real sends still surface provider-level rejections.
 */
const ADDRESS_RE = /^[^\s@]+@([^\s@.]+\.)+[^\s@.]+$/;

/** Classify an address for deliverability (trims input; the domain check is case-insensitive). */
export function classifyEmailDeliverability(email: string | null | undefined): EmailDeliverability {
  const trimmed = (email ?? '').trim();
  if (!ADDRESS_RE.test(trimmed)) return { deliverable: false, reason: 'invalid_format' };

  const domain = trimmed.slice(trimmed.lastIndexOf('@') + 1).toLowerCase();
  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  if (tld === 'demo') return { deliverable: false, reason: 'demo_address' };
  if (RESERVED_TLDS.has(tld)) return { deliverable: false, reason: 'reserved_tld' };

  return { deliverable: true };
}

/** True when the address looks real enough to attempt a send. */
export function isDeliverableEmail(email: string | null | undefined): boolean {
  return classifyEmailDeliverability(email).deliverable;
}

/** A short, human label for why a send was skipped — used in logs + the in-app notice. */
export function undeliverableReasonLabel(reason: UndeliverableReason): string {
  switch (reason) {
    case 'demo_address':
      return 'demo address';
    case 'reserved_tld':
      return 'reserved/non-routable domain';
    case 'invalid_format':
      return 'invalid email address';
  }
}
