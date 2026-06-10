import { AppShell } from "@/components/app-shell";
import { ProfileScreen } from "@/components/profile";
import { getRecipientProfile } from "@/lib/profile/queries";

// Server component: load the active circle's recipient profile (RLS-scoped) and hand it to the
// client screen. Keyed by circle so switching circles remounts with fresh data.
export default async function ProfilePage() {
  const initial = await getRecipientProfile();
  return (
    <AppShell>
      <ProfileScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
