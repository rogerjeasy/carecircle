import { AppShell } from "@/components/app-shell";
import { AskScreen } from "@/components/ask";
import { getCareRecipient } from "@/lib/circle/care-recipient";
import { getActiveCircleId } from "@/lib/circle/active-circle";
import { listConversations, getConversation } from "@/lib/ask/conversations";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // Resolve recipient (for copy), circle id (to key the screen), and the user's saved conversations.
  // Auth is enforced by the (app) layout.
  const [{ q }, recipient, circleId, conversations] = await Promise.all([
    searchParams,
    getCareRecipient(),
    getActiveCircleId(),
    listConversations(),
  ]);
  const firstName = recipient?.fullName?.trim().split(/\s+/)[0] ?? null;
  // A `?q=` handoff from the top-bar search starts a FRESH thread with that question; otherwise
  // restore the most recent conversation so a refresh keeps the thread on screen.
  const handoffQuery = q?.trim() ? q.trim().slice(0, 500) : null;
  const initialConversation =
    !handoffQuery && conversations[0] ? await getConversation(conversations[0].id) : null;

  return (
    <AppShell>
      <AskScreen
        key={circleId ?? "none"}
        recipientName={firstName}
        conversations={conversations}
        initialConversation={initialConversation}
        initialQuery={handoffQuery}
      />
    </AppShell>
  );
}
