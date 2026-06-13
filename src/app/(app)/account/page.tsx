import { AppShell } from "@/components/app-shell";
import { AccountScreen } from "@/components/account";

export const metadata = { title: "Your profile · Kintwadi" };

// The signed-in user's own account ("Your profile"). Lives under (app)/ so requireSession()
// in the route-group layout protects it; the screen loads/saves through the session-pinned
// account server actions (src/lib/account/actions.ts).
export default function AccountPage() {
  return (
    <AppShell>
      <AccountScreen />
    </AppShell>
  );
}
