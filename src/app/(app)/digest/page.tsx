import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { DigestScreen } from "@/components/digest";
import { getCareRecipient } from "@/lib/circle/care-recipient";
import { getActiveCircleId, resolveActiveMembership } from "@/lib/circle/active-circle";
import { getDigestByDate, getMyFeedback, getMyDigestLanguage } from "@/lib/digest/queries";
import { canGenerateDigest } from "@/lib/digest/access";
import type { Feedback } from "@/components/digest/types";

export default async function DigestPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [recipient, circleId, membership] = await Promise.all([
    getCareRecipient(),
    getActiveCircleId(),
    resolveActiveMembership(),
  ]);
  const firstName = recipient?.fullName?.trim().split(/\s+/)[0] ?? null;

  // Seed today's saved digest (if any) + the viewer's feedback so the screen renders without a flash.
  const initialDigest = circleId ? await getDigestByDate(circleId, today) : null;
  let initialFeedback: Feedback = null;
  if (initialDigest) initialFeedback = await getMyFeedback(initialDigest.id);
  // The viewer's digest language — when not English, the screen auto-translates each day's
  // narrative (cached on the digest row) and offers an original/translated toggle.
  const viewerLanguage = circleId ? await getMyDigestLanguage(circleId) : "en";

  return (
    <AppShell>
      <DigestScreen
        key={circleId ?? "none"}
        recipientName={firstName}
        today={today}
        initialDigest={initialDigest}
        initialFeedback={initialFeedback}
        canGenerate={canGenerateDigest(membership?.role)}
        viewerLanguage={viewerLanguage}
      />
    </AppShell>
  );
}
