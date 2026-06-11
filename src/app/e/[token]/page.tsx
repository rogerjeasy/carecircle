import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { getSharedEmergencyCard } from "@/lib/emergency-card/share";
import { PublicEmergencyCard } from "@/components/profile/public-emergency-card";

/**
 * PUBLIC route: the emergency-card share view EMS opens by scanning the printed QR.
 *
 * 🔒 Security (see AGENTS.md + src/lib/emergency-card/share.ts): this page is in the proxy's
 * public allowlist ON PURPOSE — the unguessable, expiring, revocable token in the URL is the
 * authorization (same capability model as /invite/<token>). The lookup is fail-closed (one
 * indistinguishable "invalid" answer for unknown/revoked/expired/malformed), the payload is only
 * the card projection, and every successful open is counted + written to the audit log.
 */

// Never index a link that exposes health data; the token in the URL is the only way in.
export const metadata: Metadata = {
  title: "Emergency Card — CareCircle",
  robots: { index: false, follow: false },
};

// Token validity is time-based (expiry) and revocable — always resolve fresh.
export const dynamic = "force-dynamic";

export default async function SharedEmergencyCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedEmergencyCard(token);

  if (result.status !== "ok") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold">This emergency link isn&apos;t active</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have expired or been revoked by the family. Ask a family member to share a
              fresh link from their CareCircle emergency card.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <PublicEmergencyCard
        data={result.card}
        validUntil={format(result.expiresAt, "EEE d MMM, h:mmaaa")}
      />
    </main>
  );
}
