import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from './index';
import { hashToken } from '@/lib/auth/tokens';
import { serverLog } from '@/lib/log';

/**
 * Public-facing invitation lookup for the /invite/<token> page.
 *
 * The invitee typically has NO session yet and is NOT a member, so the RLS-bound app role can't
 * read the `invitation` row directly. `invitation_details()` (drizzle/0006) is a SECURITY DEFINER
 * function that returns only safe display fields for a single token — possession of the token (the
 * capability secret in the link) is the authorization. We call it through the raw `db` client
 * WITHOUT an RLS context on purpose; the function — not the app role — governs access here.
 *
 * 🔒 Tokens are hashed at rest (drizzle/0045, same rule as password-reset tokens): the link
 * carries the raw secret, the database stores only its SHA-256. Every lookup therefore hashes
 * the URL token first — a leaked table/backup never yields working join links.
 */
export type InvitationDetails = {
  circleId: string;
  circleName: string;
  recipientName: string;
  inviterName: string | null;
  role: string;
  relationshipLabel: string | null;
  personalNote: string | null;
  status: string;
  expiresAt: Date;
  isValid: boolean;
};

type DetailsRow = {
  circle_id: string;
  circle_name: string;
  recipient_name: string;
  inviter_name: string | null;
  role: string;
  relationship_label: string | null;
  personal_note: string | null;
  status: string;
  expires_at: string | Date;
  is_valid: boolean;
};

export async function getInvitationByToken(token: string): Promise<InvitationDetails | null> {
  if (!token || token.length > 512) return null;
  try {
    const rows = (await db.execute(
      sql`select * from invitation_details(${hashToken(token)})`,
    )) as unknown as DetailsRow[];
    const r = rows[0];
    serverLog('invitations', 'lookup', r ? 'success' : 'failure', r ? undefined : { reason: 'not_found' });
    if (!r) return null;
    return {
      circleId: r.circle_id,
      circleName: r.circle_name,
      recipientName: r.recipient_name,
      inviterName: r.inviter_name,
      role: r.role,
      relationshipLabel: r.relationship_label,
      personalNote: r.personal_note,
      status: r.status,
      expiresAt: new Date(r.expires_at),
      isValid: r.is_valid,
    };
  } catch (err) {
    serverLog('invitations', 'lookup', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return null;
  }
}
