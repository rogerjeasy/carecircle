/**
 * GET /api/admin/stream — Server-Sent Events feed for the platform console (replaces polling).
 *
 * One long-lived connection per admin tab. The browser's EventSource opens it once and the server
 * PUSHES updates: `health` (system status, pushed on change by the shared monitor) and `safety`
 * (incident feed, pushed the instant a NOTIFY fires). No client polling. Gated by
 * `requirePlatformAdmin()`; the underlying reads are audited per push inside the hub.
 *
 * Note on hosting: classic serverless functions cap execution duration, which closes the stream
 * periodically — EventSource then auto-reconnects (we hint `retry: 10s`). That's still far cheaper
 * than interval polling, and on a long-lived Node host / Vercel Fluid Compute the stream stays open.
 */
import { requirePlatformAdmin } from '@/db/dal';
import { subscribe, type Subscriber } from '@/lib/admin/live-hub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Allow long-lived streams where the platform supports it (Vercel Pro/Fluid). Harmless elsewhere.
export const maxDuration = 300;

const HEARTBEAT_MS = 25_000;

export async function GET(req: Request) {
  // Defense-in-depth: re-check the admin allowlist here, never trust the layout/proxy.
  const admin = await requirePlatformAdmin();

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true; // controller already closed (client gone) — stop writing
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Tell EventSource how long to wait before reconnecting if the stream drops.
      write('retry: 10000\n\n');

      const sub: Subscriber = {
        actor: { id: admin.id, email: admin.email },
        send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      };

      // If the client already aborted, don't bother subscribing.
      if (req.signal.aborted) {
        cleanup();
        return;
      }

      unsubscribe = await subscribe(sub);

      // Comment-only heartbeat keeps proxies from idling the connection out (not a data poll).
      heartbeat = setInterval(() => write(': ping\n\n'), HEARTBEAT_MS);

      // Client disconnect / navigation → release the subscription (and shared work if last out).
      req.signal.addEventListener('abort', cleanup);
    },

    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable proxy buffering so events flush immediately
    },
  });
}
