'use server';

/**
 * Billing (preview) — read the circle's plan + payment methods + invoices, and add/remove/select a
 * default card. Coordinator-only (owner / family_admin); the payment_method / invoice RLS policies
 * are the backstop.
 *
 * 🔒 PCI: we NEVER store or log a full card number or CVV. The add flow takes a card number ONLY to
 * derive the brand + last 4, then discards it — the row keeps just brand/last4/expiry (what a
 * tokenizing processor would return). Card input rides in FormData so Next's dev logger can't print
 * it; logs carry brand/last4 at most.
 */
import { z } from 'zod';
import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm';
import { format } from 'date-fns';
import { requireSession, withAuthedDb } from '@/db/dal';
import { recordAuditEvent } from '@/db/audit';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { careCircle, paymentMethod, invoice as invoiceTable, membership } from '@/db/schema';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'Billing is managed by your circle’s coordinator.';
const NO_CIRCLE = 'No active care circle.';
const MANAGE_ROLES = new Set(['owner', 'family_admin']);

interface ActorContext {
  userId: string;
  circleId: string;
  membershipId: string;
  role: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ id: membership.id, role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.circleId, circleId),
          eq(membership.userId, user.id),
          eq(membership.status, 'active'),
          isNull(membership.deletedAt),
        ),
      )
      .limit(1),
  );
  if (!m) return null;
  return { userId: user.id, circleId, membershipId: m.id, role: m.role };
}

export interface PaymentMethodDTO {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}
export interface InvoiceDTO {
  id: string;
  number: string;
  /** Formatted amount, e.g. "$12.00". */
  amount: string;
  /** Formatted issue date, e.g. "Jun 1, 2026". */
  date: string;
  status: string;
  pdfUrl: string | null;
}
export interface BillingData {
  canManage: boolean;
  plan: string;
  cards: PaymentMethodDTO[];
  invoices: InvoiceDTO[];
}

export type LoadBillingResult = { ok: true; billing: BillingData } | { ok: false; error: string };

function formatAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

/** Load the circle's plan + (coordinator-only) payment methods + invoices. */
export async function loadBilling(): Promise<LoadBillingResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  const canManage = MANAGE_ROLES.has(ctx.role);
  try {
    const data = await withAuthedDb(async (tx) => {
      const [circle] = await tx.select({ plan: careCircle.plan }).from(careCircle).where(eq(careCircle.id, ctx.circleId)).limit(1);
      // RLS limits these to coordinators; non-coordinators simply get empty lists.
      const cards = canManage
        ? await tx
            .select()
            .from(paymentMethod)
            .where(and(eq(paymentMethod.circleId, ctx.circleId), isNull(paymentMethod.deletedAt)))
            .orderBy(desc(paymentMethod.isDefault), asc(paymentMethod.createdAt))
        : [];
      const invoices = canManage
        ? await tx
            .select()
            .from(invoiceTable)
            .where(and(eq(invoiceTable.circleId, ctx.circleId), isNull(invoiceTable.deletedAt)))
            .orderBy(desc(invoiceTable.issuedAt))
        : [];
      return { plan: circle?.plan ?? 'free', cards, invoices };
    });

    serverLog('billing', 'load', 'success', { actor: ctx.userId, cards: data.cards.length, invoices: data.invoices.length });
    return {
      ok: true,
      billing: {
        canManage,
        plan: data.plan,
        cards: data.cards.map((c) => ({
          id: c.id,
          brand: c.brand,
          last4: c.last4,
          expMonth: c.expMonth,
          expYear: c.expYear,
          isDefault: c.isDefault,
        })),
        invoices: data.invoices.map((iv) => ({
          id: iv.id,
          number: iv.number,
          amount: formatAmount(iv.amountCents, iv.currency),
          date: format(iv.issuedAt, 'MMM d, yyyy'),
          status: iv.status,
          pdfUrl: iv.pdfUrl ?? null,
        })),
      },
    };
  } catch (err) {
    serverLog('billing', 'load', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** Card network from the leading digits (display only). */
function detectBrand(num: string): string {
  if (/^4/.test(num)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(num)) return 'discover';
  return 'card';
}

/** Luhn checksum — rejects obvious typos without needing a processor. */
function luhnValid(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const addCardSchema = z.object({
  number: z.string().regex(/^\d{13,19}$/),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2000).max(2100),
  makeDefault: z.boolean().optional().default(false),
});

/** Add a payment card — stores ONLY brand + last4 + expiry (the number is discarded). */
export async function addPaymentMethod(formData: FormData): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('billing', 'addCard', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (!MANAGE_ROLES.has(ctx.role)) return { ok: false, error: FORBIDDEN };

  const number = (formData.get('number')?.toString() ?? '').replace(/[\s-]/g, '');
  const parsed = addCardSchema.safeParse({
    number,
    expMonth: Number(formData.get('expMonth')),
    expYear: Number(formData.get('expYear')),
    makeDefault: formData.get('makeDefault') === 'true',
  });
  if (!parsed.success) return { ok: false, error: 'Please enter valid card details.' };
  if (!luhnValid(parsed.data.number)) return { ok: false, error: 'That card number looks invalid.' };
  // Expiry must be in the future (end of the expiry month).
  const now = new Date();
  if (parsed.data.expYear < now.getFullYear() || (parsed.data.expYear === now.getFullYear() && parsed.data.expMonth < now.getMonth() + 1)) {
    return { ok: false, error: 'That card has expired.' };
  }

  const brand = detectBrand(parsed.data.number);
  const last4 = parsed.data.number.slice(-4);

  try {
    await withAuthedDb(async (tx) => {
      const existing = await tx
        .select({ id: paymentMethod.id })
        .from(paymentMethod)
        .where(and(eq(paymentMethod.circleId, ctx.circleId), isNull(paymentMethod.deletedAt)));
      const makeDefault = parsed.data.makeDefault || existing.length === 0; // first card is default
      if (makeDefault && existing.length > 0) {
        await tx.update(paymentMethod).set({ isDefault: false }).where(eq(paymentMethod.circleId, ctx.circleId));
      }
      await tx.insert(paymentMethod).values({
        circleId: ctx.circleId,
        brand,
        last4,
        expMonth: parsed.data.expMonth,
        expYear: parsed.data.expYear,
        isDefault: makeDefault,
        addedByMembershipId: ctx.membershipId,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'payment_method', summary: `Added a ${brand} card ending ${last4}` },
        tx,
      );
    });
    serverLog('billing', 'addCard', 'success', { actor: ctx.userId, brand, last4 });
    return { ok: true };
  } catch (err) {
    serverLog('billing', 'addCard', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Remove a payment card (soft-delete). Promotes another card to default if the default was removed. */
export async function removePaymentMethod(id: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('billing', 'removeCard', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (!MANAGE_ROLES.has(ctx.role)) return { ok: false, error: FORBIDDEN };
  const cardId = z.string().uuid().safeParse(id);
  if (!cardId.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [removed] = await tx
        .update(paymentMethod)
        .set({ deletedAt: new Date(), isDefault: false, updatedAt: new Date() })
        .where(and(eq(paymentMethod.id, cardId.data), eq(paymentMethod.circleId, ctx.circleId), isNull(paymentMethod.deletedAt)))
        .returning({ id: paymentMethod.id, wasDefault: paymentMethod.isDefault });
      if (!removed) throw new Error('not_found_or_forbidden');
      // Ensure a default still exists if any cards remain.
      const [remaining] = await tx
        .select({ id: paymentMethod.id, isDefault: paymentMethod.isDefault })
        .from(paymentMethod)
        .where(and(eq(paymentMethod.circleId, ctx.circleId), isNull(paymentMethod.deletedAt)))
        .orderBy(asc(paymentMethod.createdAt))
        .limit(1);
      if (remaining && !remaining.isDefault) {
        const anyDefault = await tx
          .select({ id: paymentMethod.id })
          .from(paymentMethod)
          .where(and(eq(paymentMethod.circleId, ctx.circleId), isNull(paymentMethod.deletedAt), eq(paymentMethod.isDefault, true)))
          .limit(1);
        if (anyDefault.length === 0) {
          await tx.update(paymentMethod).set({ isDefault: true }).where(eq(paymentMethod.id, remaining.id));
        }
      }
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'payment_method', entityId: cardId.data, summary: 'Removed a payment card' },
        tx,
      );
    });
    serverLog('billing', 'removeCard', 'success', { actor: ctx.userId, id: cardId.data });
    return { ok: true };
  } catch (err) {
    serverLog('billing', 'removeCard', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Make a card the default (unsets the others). */
export async function setDefaultPaymentMethod(id: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (!MANAGE_ROLES.has(ctx.role)) return { ok: false, error: FORBIDDEN };
  const cardId = z.string().uuid().safeParse(id);
  if (!cardId.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [target] = await tx
        .select({ id: paymentMethod.id })
        .from(paymentMethod)
        .where(and(eq(paymentMethod.id, cardId.data), eq(paymentMethod.circleId, ctx.circleId), isNull(paymentMethod.deletedAt)))
        .limit(1);
      if (!target) throw new Error('not_found_or_forbidden');
      await tx
        .update(paymentMethod)
        .set({ isDefault: false })
        .where(and(eq(paymentMethod.circleId, ctx.circleId), ne(paymentMethod.id, cardId.data)));
      await tx.update(paymentMethod).set({ isDefault: true, updatedAt: new Date() }).where(eq(paymentMethod.id, cardId.data));
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'payment_method', entityId: cardId.data, summary: 'Set the default payment card' },
        tx,
      );
    });
    serverLog('billing', 'setDefaultCard', 'success', { actor: ctx.userId, id: cardId.data });
    return { ok: true };
  } catch (err) {
    serverLog('billing', 'setDefaultCard', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
