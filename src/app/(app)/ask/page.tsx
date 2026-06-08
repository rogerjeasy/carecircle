import { AppShell } from "@/components/app-shell";
import { AskScreen } from "@/components/ask";
import { getCareRecipient } from "@/lib/circle/care-recipient";
import { getActiveCircleId } from "@/lib/circle/active-circle";
import { listConversations, getConversation } from "@/lib/ask/conversations";

export default async function AskPage() {
  // Resolve recipient (for copy), circle id (to key the screen), and the user's saved conversations.
  // Auth is enforced by the (app) layout.
  const [recipient, circleId, conversations] = await Promise.all([
    getCareRecipient(),
    getActiveCircleId(),
    listConversations(),
  ]);
  const firstName = recipient?.fullName?.trim().split(/\s+/)[0] ?? null;
  // Restore the most recent conversation so a refresh keeps the thread on screen.
  const initialConversation = conversations[0] ? await getConversation(conversations[0].id) : null;

  return (
    <AppShell>
      <AskScreen
        key={circleId ?? "none"}
        recipientName={firstName}
        conversations={conversations}
        initialConversation={initialConversation}
      />
    </AppShell>
  );
}
