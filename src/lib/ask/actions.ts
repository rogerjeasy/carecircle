'use server';

/**
 * "Ask Kintwadi" server actions — grounded RAG over THIS circle's record, with saved conversations.
 *
 * Pipeline: retrieve (vector chunks from Aurora pgvector, sensitivity-filtered by RLS + a structured
 * snapshot of meds/vitals/appointments/tasks) → generate (Claude on Bedrock, grounded, citing
 * sources) → PERSIST the user + assistant turns so the thread survives a refresh.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Re-checks `requireSession()` and resolves the user's REAL membership/role in the active circle.
 *  - Retrieval is RLS/sensitivity-scoped to that circle. Conversations are PRIVATE to their owner
 *    (ask_conversation/ask_message RLS), written under the actor's RLS context.
 *  - Reading the record to answer is a view of sensitive data → AUDITED, with operational
 *    (`serverLog`) and durable (`recordAuditEvent`) trails.
 */
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { membership, askConversation, askMessage } from '@/db/schema';
import { getCareContext } from './retrieval';
import { retrieveVectorContext } from '@/lib/rag/retrieval';
import { getConversation } from './conversations';
import { askClaude, isBedrockConfigured } from './bedrock';
import type { ConversationDetail, SourceRef } from '@/components/ask/types';

export type AskResult =
  | { ok: true; answer: string; sources: SourceRef[]; conversationId: string; title: string }
  | { ok: false; error: string };

const GENERIC_ERROR = 'Something went wrong. Please try again.';

interface ActorContext {
  userId: string;
  circleId: string;
  role: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ role: membership.role })
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
  return { userId: user.id, circleId, role: m.role };
}

/** A short, single-line title derived from the first question. */
function makeTitle(question: string): string {
  const clean = question.trim().replace(/\s+/g, ' ');
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

function systemPrompt(recipientName: string | null): string {
  const who = recipientName ?? 'the care recipient';
  return [
    `You are Kintwadi's assistant, helping a caregiver understand ${who}'s care.`,
    'Answer ONLY using the CONTEXT provided. Never invent facts, dates, doses, or names.',
    'If the context does not contain the answer, say so plainly and suggest what to check.',
    'Use CONVERSATION SO FAR only to resolve references (e.g. "he", "that medication"); never treat it as fact about the record.',
    'Be warm, concise, and specific. Use plain language a worried family member can follow.',
    'Each context item is prefixed with a tag like [S1] or [V2]. Cite the tags you actually used.',
    'Do NOT put the bracket tags in your prose — only list them in "sourceIds".',
    'Respond with ONLY a JSON object: {"answer": string, "sourceIds": string[]}.',
  ].join(' ');
}

/** Extract a JSON object from a model reply that may be wrapped in prose or code fences. */
function parseModelJson(raw: string): { answer: string; sourceIds: string[] } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    const answer = typeof obj.answer === 'string' ? obj.answer : '';
    const sourceIds = Array.isArray(obj.sourceIds) ? obj.sourceIds.filter((s: unknown) => typeof s === 'string') : [];
    return answer ? { answer, sourceIds } : null;
  } catch {
    return null;
  }
}

const TAG_RE = /\[(?:S|V)\d+\]/g;

/** Load the last few turns of a conversation (oldest→newest) to give the model follow-up context. */
async function recentHistory(conversationId: string, circleId: string, userId: string): Promise<string> {
  const rows = await withAuthedDb((tx) =>
    tx
      .select({ role: askMessage.role, content: askMessage.content })
      .from(askMessage)
      .where(
        and(
          eq(askMessage.conversationId, conversationId),
          eq(askMessage.circleId, circleId),
          eq(askMessage.userId, userId),
        ),
      )
      .orderBy(desc(askMessage.createdAt))
      .limit(6),
  );
  return rows
    .reverse()
    .map((r) => `${r.role === 'user' ? 'Caregiver' : 'Assistant'}: ${r.content.slice(0, 500)}`)
    .join('\n');
}

const askSchema = z.object({
  question: z.string().trim().min(1).max(500),
  conversationId: z.string().uuid().nullish(),
});

/** Ask a grounded question about the active circle's record, persisting the turn. */
export async function askKintwadi(question: string, conversationId?: string | null): Promise<AskResult> {
  const ctx = await getActorContext();
  serverLog('ask', 'askKintwadi', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };

  const parsed = askSchema.safeParse({ question, conversationId: conversationId ?? undefined });
  if (!parsed.success) return { ok: false, error: 'Please type a question.' };

  if (!isBedrockConfigured()) {
    serverLog('ask', 'askKintwadi', 'failure', { actor: ctx.userId, reason: 'bedrock_unconfigured' });
    return { ok: false, error: 'The assistant isn’t available yet — Bedrock is not configured.' };
  }

  const q = parsed.data.question;
  // Only trust a conversation id that is really the caller's (RLS-checked) in this circle.
  let convId: string | null = null;
  if (parsed.data.conversationId) {
    const existing = await getConversation(parsed.data.conversationId);
    if (existing) convId = existing.id;
  }

  try {
    // 1) History (for follow-up coherence) + retrieval (structured snapshot + vector chunks).
    const history = convId ? await recentHistory(convId, ctx.circleId, ctx.userId) : '';
    const structured = await getCareContext(ctx.circleId);
    const vector = await retrieveVectorContext({
      circleId: ctx.circleId,
      question: q,
      tagStart: structured.sources.length,
    });

    const allSources: SourceRef[] = [...structured.sources, ...vector.sources];
    const context = [structured.contextText, vector.contextText].filter(Boolean).join('\n\n') || 'No records are available yet.';

    // 2) Generate.
    const raw = await askClaude({
      system: systemPrompt(structured.recipientName),
      user: `${history ? `CONVERSATION SO FAR:\n${history}\n\n` : ''}CONTEXT:\n${context}\n\nQUESTION: ${q}`,
      maxTokens: 900,
    });

    // 3) Parse + map citations.
    const parsedOut = parseModelJson(raw);
    const answerText = (parsedOut?.answer ?? raw).replace(TAG_RE, '').replace(/\s{2,}/g, ' ').trim();
    const citedIds = new Set(parsedOut?.sourceIds ?? []);
    let sources = allSources.filter((s) => citedIds.has(s.id));
    if (sources.length === 0) sources = vector.sources.slice(0, 3);

    // 4) Persist the turn (create the conversation on first ask) + audit the read.
    const title = makeTitle(q);
    const savedId = await withAuthedDb(async (tx) => {
      let id = convId;
      if (!id) {
        const [created] = await tx
          .insert(askConversation)
          .values({ circleId: ctx.circleId, userId: ctx.userId, title })
          .returning({ id: askConversation.id });
        id = created.id;
      } else {
        await tx
          .update(askConversation)
          .set({ updatedAt: new Date() })
          .where(and(eq(askConversation.id, id), eq(askConversation.circleId, ctx.circleId)));
      }
      await tx.insert(askMessage).values([
        { conversationId: id, circleId: ctx.circleId, userId: ctx.userId, role: 'user', content: q },
        {
          conversationId: id,
          circleId: ctx.circleId,
          userId: ctx.userId,
          role: 'assistant',
          content: answerText,
          sources: sources.length ? sources : null,
        },
      ]);
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'read', entityType: 'ask', entityId: id, summary: 'Asked the care assistant a question' },
        tx,
      );
      return id;
    });

    serverLog('ask', 'askKintwadi', 'success', {
      actor: ctx.userId,
      conversation: savedId,
      vectorSources: vector.sources.length,
      cited: sources.length,
    });
    return { ok: true, answer: answerText, sources, conversationId: savedId, title };
  } catch (err) {
    serverLog('ask', 'askKintwadi', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type LoadConversationResult = { ok: true; data: ConversationDetail } | { ok: false; error: string };

/** Open a saved conversation (the caller's own). */
export async function loadConversation(conversationId: string): Promise<LoadConversationResult> {
  const id = z.string().uuid().safeParse(conversationId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };
  const data = await getConversation(id.data);
  if (!data) return { ok: false, error: 'Conversation not found.' };
  return { ok: true, data };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** Rename one of the caller's conversations. */
export async function renameConversation(conversationId: string, title: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('ask', 'renameConversation', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const id = z.string().uuid().safeParse(conversationId);
  const clean = z.string().trim().min(1).max(80).safeParse(title);
  if (!id.success || !clean.success) return { ok: false, error: 'Please enter a valid title.' };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(askConversation)
        .set({ title: clean.data, updatedAt: new Date() })
        .where(
          and(
            eq(askConversation.id, id.data),
            eq(askConversation.circleId, ctx.circleId),
            isNull(askConversation.deletedAt),
          ),
        )
        .returning({ id: askConversation.id });
      if (!row) throw new Error('not_found');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'ask', entityId: id.data, summary: 'Renamed a saved conversation' },
        tx,
      );
    });
    serverLog('ask', 'renameConversation', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('ask', 'renameConversation', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Soft-delete one of the caller's conversations. */
export async function deleteConversation(conversationId: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('ask', 'deleteConversation', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const id = z.string().uuid().safeParse(conversationId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(askConversation)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(askConversation.id, id.data),
            eq(askConversation.circleId, ctx.circleId),
            isNull(askConversation.deletedAt),
          ),
        )
        .returning({ id: askConversation.id });
      if (!row) throw new Error('not_found');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'ask', entityId: id.data, summary: 'Deleted a saved conversation' },
        tx,
      );
    });
    serverLog('ask', 'deleteConversation', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('ask', 'deleteConversation', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
