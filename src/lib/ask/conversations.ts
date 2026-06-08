import 'server-only';

/**
 * Read layer for saved Ask conversations.
 *
 * Security (see AGENTS.md): everything runs through `withAuthedDb()` (RLS), and conversations are
 * PRIVATE to their owner — the `ask_conversation` / `ask_message` RLS policies (drizzle/0028) admit
 * a row only when its circle is one of the caller's AND its user_id is the caller. We additionally
 * scope to the ACTIVE circle so switching circles shows the right history.
 */
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { askConversation, askMessage } from '@/db/schema';
import { serverLog, maskEmail } from '@/lib/log';
import type { ConversationDetail, ConversationSummary, Message, SourceRef } from '@/components/ask/types';

/** List the signed-in user's conversations in the active circle, newest first. */
export async function listConversations(): Promise<ConversationSummary[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  try {
    const circleId = await getActiveCircleId();
    if (!circleId) return [];
    const rows = await withAuthedDb((tx) =>
      tx
        .select({ id: askConversation.id, title: askConversation.title, updatedAt: askConversation.updatedAt })
        .from(askConversation)
        .where(
          and(
            eq(askConversation.circleId, circleId),
            eq(askConversation.userId, session.user!.id),
            isNull(askConversation.deletedAt),
          ),
        )
        .orderBy(desc(askConversation.updatedAt))
        .limit(50),
    );
    return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt.toISOString() }));
  } catch (err) {
    serverLog('ask', 'listConversations', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as Error)?.name ?? 'error',
    });
    return [];
  }
}

/** Load one conversation (its messages) — null if it doesn't exist or isn't the caller's. */
export async function getConversation(conversationId: string): Promise<ConversationDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  try {
    const circleId = await getActiveCircleId();
    if (!circleId) return null;

    const data = await withAuthedDb(async (tx) => {
      const [conv] = await tx
        .select({ id: askConversation.id, title: askConversation.title })
        .from(askConversation)
        .where(
          and(
            eq(askConversation.id, conversationId),
            eq(askConversation.circleId, circleId),
            isNull(askConversation.deletedAt),
          ),
        )
        .limit(1);
      if (!conv) return null;

      const rows = await tx
        .select({
          id: askMessage.id,
          role: askMessage.role,
          content: askMessage.content,
          sources: askMessage.sources,
        })
        .from(askMessage)
        .where(eq(askMessage.conversationId, conversationId))
        .orderBy(asc(askMessage.createdAt));

      return { conv, rows };
    });

    if (!data) return null;
    const messages: Message[] = data.rows.map((r) => ({
      id: r.id,
      role: r.role,
      text: r.content,
      sources: Array.isArray(r.sources) ? (r.sources as SourceRef[]) : undefined,
    }));
    return { id: data.conv.id, title: data.conv.title, messages };
  } catch (err) {
    serverLog('ask', 'getConversation', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
