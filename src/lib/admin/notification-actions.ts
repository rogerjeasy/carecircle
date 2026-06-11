'use server';

/**
 * Status-alert recipient management (/admin/system → "Outage notifications" card) — add, update,
 * pause/resume, and remove the people who get the service-down / recovered emails.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Every action re-checks `requirePlatformAdmin()` itself — never trusts the page/layout ran.
 *  - Writes go through the privileged connection: the table is platform-level (RLS enabled with
 *    NO policies, so the app role can't touch it), holds no tenant data, and belongs to no circle
 *    — so the durable trail is the operational `serverLog` (masked emails only), per the project
 *    rule for circle-less actions.
 *  - Emails ride in FormData and are zod-validated; logs never contain the raw address.
 */
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { and, eq, ne, sql } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/db/dal';
import { getPlatformDb } from '@/db/admin-db';
import { statusAlertRecipient } from '@/db/schema';
import { serverLog, maskEmail } from '@/lib/log';

export type AdminActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = 'Something went wrong. Please try again.';

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');
const nameSchema = z
  .string()
  .trim()
  .max(120)
  .transform((v) => v || null);

/** Add a new alert recipient (active immediately). */
export async function addStatusRecipient(formData: FormData): Promise<AdminActionResult> {
  const admin = await requirePlatformAdmin();
  serverLog('status', 'addRecipient', 'start', { actor: admin.id });

  const parsed = z
    .object({ email: emailSchema, name: nameSchema.optional() })
    .safeParse({ email: formData.get('email'), name: formData.get('name') ?? '' });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }
  const { email, name } = parsed.data;

  try {
    const db = getPlatformDb();
    const [existing] = await db
      .select({ id: statusAlertRecipient.id })
      .from(statusAlertRecipient)
      .where(sql`lower(${statusAlertRecipient.email}) = ${email}`)
      .limit(1);
    if (existing) return { ok: false, error: 'That email address is already on the list.' };

    await db.insert(statusAlertRecipient).values({ email, name: name ?? null });
    serverLog('status', 'addRecipient', 'success', { actor: admin.id, email: maskEmail(email) });
    revalidatePath('/admin/system');
    return { ok: true };
  } catch (err) {
    serverLog('status', 'addRecipient', 'failure', { actor: admin.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Update a recipient's email/name and/or pause-resume their alerts. */
export async function updateStatusRecipient(formData: FormData): Promise<AdminActionResult> {
  const admin = await requirePlatformAdmin();
  serverLog('status', 'updateRecipient', 'start', { actor: admin.id });

  const parsed = z
    .object({
      id: z.string().uuid(),
      email: emailSchema,
      name: nameSchema.optional(),
      active: z.enum(['true', 'false']),
    })
    .safeParse({
      id: formData.get('id'),
      email: formData.get('email'),
      name: formData.get('name') ?? '',
      active: formData.get('active'),
    });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }
  const { id, email, name, active } = parsed.data;

  try {
    const db = getPlatformDb();
    const [taken] = await db
      .select({ id: statusAlertRecipient.id })
      .from(statusAlertRecipient)
      .where(and(sql`lower(${statusAlertRecipient.email}) = ${email}`, ne(statusAlertRecipient.id, id)))
      .limit(1);
    if (taken) return { ok: false, error: 'That email address is already on the list.' };

    const [row] = await db
      .update(statusAlertRecipient)
      .set({ email, name: name ?? null, active: active === 'true', updatedAt: new Date() })
      .where(eq(statusAlertRecipient.id, id))
      .returning({ id: statusAlertRecipient.id });
    if (!row) return { ok: false, error: 'Recipient not found.' };

    serverLog('status', 'updateRecipient', 'success', {
      actor: admin.id,
      id,
      email: maskEmail(email),
      active,
    });
    revalidatePath('/admin/system');
    return { ok: true };
  } catch (err) {
    serverLog('status', 'updateRecipient', 'failure', { actor: admin.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Remove a recipient from the alert list entirely. */
export async function removeStatusRecipient(formData: FormData): Promise<AdminActionResult> {
  const admin = await requirePlatformAdmin();
  serverLog('status', 'removeRecipient', 'start', { actor: admin.id });

  const parsed = z.string().uuid().safeParse(formData.get('id'));
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    const [row] = await getPlatformDb()
      .delete(statusAlertRecipient)
      .where(eq(statusAlertRecipient.id, parsed.data))
      .returning({ id: statusAlertRecipient.id });
    if (!row) return { ok: false, error: 'Recipient not found.' };

    serverLog('status', 'removeRecipient', 'success', { actor: admin.id, id: parsed.data });
    revalidatePath('/admin/system');
    return { ok: true };
  } catch (err) {
    serverLog('status', 'removeRecipient', 'failure', { actor: admin.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
