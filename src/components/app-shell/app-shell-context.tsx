"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/user/current-user";
import { getUserCircles, setActiveCircle } from "@/lib/circle/circles";
import { signOutAction } from "@/lib/auth/actions";

// Role definitions with their visible nav items
export type UserRole = 
  | "coordinator" 
  | "family" 
  | "caregiver" 
  | "readonly" 
  | "care-recipient" 
  | "clinician";

export const roleLabels: Record<UserRole, string> = {
  coordinator: "Coordinator",
  family: "Family",
  caregiver: "Caregiver",
  readonly: "Read-only",
  "care-recipient": "Care recipient",
  clinician: "Clinician",
};

// Define which nav items are visible for each role
export const roleNavAccess: Record<UserRole, string[]> = {
  coordinator: [
    "/dashboard",
    "/timeline",
    "/medications",
    "/appointments",
    "/tasks",
    "/health",
    "/documents",
    "/people",
    "/digest",
    "/ask",
    "/settings",
    "/rota",
  ],
  family: [
    "/dashboard",
    "/timeline",
    "/medications",
    "/appointments",
    "/health",
    "/documents",
    "/digest",
    "/ask",
  ],
  caregiver: [
    "/dashboard",
    "/timeline",
    "/medications",
    "/appointments",
    "/tasks",
    "/health",
    "/documents",
    "/ask",
  ],
  readonly: [
    "/dashboard",
    "/timeline",
    "/health",
    "/documents",
  ],
  "care-recipient": [
    "/dashboard",
    "/timeline",
    "/medications",
    "/appointments",
    "/health",
    "/ask",
  ],
  clinician: [
    "/dashboard",
    "/timeline",
    "/medications",
    "/health",
    "/documents",
    "/ask",
  ],
};

/** A care circle as the sidebar's "Switch Circle" menu needs it (data + an avatar color). */
export interface SidebarCircle {
  id: string;
  name: string;
  initials: string;
  color: string;
}

// Avatar colors cycled across the user's circles, by order (primary circle first).
const CIRCLE_COLORS = ["bg-primary", "bg-accent", "bg-info", "bg-success"];

interface AppShellContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  canAccessRoute: (href: string) => boolean;
  /** The real signed-in user (null while loading or if unauthenticated). */
  user: CurrentUser | null;
  /** True until the first profile fetch resolves. */
  userLoading: boolean;
  /** Clear client-side state and end the session server-side, then redirect to /sign-in. */
  signOut: () => Promise<void>;
  /** The user's real care circles, primary first (empty while loading / if none). */
  circles: SidebarCircle[];
  /** Currently-selected circle id (defaults to the primary circle once loaded). */
  activeCircleId: string | null;
  setActiveCircleId: (id: string) => void;
}

const AppShellContext = React.createContext<AppShellContextValue | undefined>(undefined);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRoleState] = React.useState<UserRole>("coordinator");
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = React.useState(true);
  const [circles, setCircles] = React.useState<SidebarCircle[]>([]);
  const [activeCircleId, setActiveCircleIdState] = React.useState<string | null>(null);

  // Optimistic default from localStorage so the demo "Switch role view" feels instant; the
  // real membership role (fetched below) is authoritative and overrides this once it arrives.
  React.useEffect(() => {
    const stored = localStorage.getItem("role-view");
    if (stored && stored in roleLabels) {
      setRoleState(stored as UserRole);
    }
  }, []);

  // Fetch the real signed-in user. Their membership role drives the role-aware UI by default.
  React.useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((u) => {
        if (!active) return;
        setUser(u);
        if (u) {
          setRoleState(u.role);
          // The user's circleId is the cookie-resolved active circle — authoritative for the
          // switcher highlight (overrides the by-order default the circles fetch may set).
          if (u.circleId) setActiveCircleIdState(u.circleId);
        }
      })
      .catch(() => {
        /* identity fetch failed — keep defaults; the server still guards every route */
      })
      .finally(() => {
        if (active) setUserLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch the user's real care circles for the "Switch Circle" menu; default the selection to
  // the primary (first) circle. Colors are assigned client-side, by order.
  React.useEffect(() => {
    let active = true;
    getUserCircles()
      .then((list) => {
        if (!active) return;
        const colored = list.map((c, i) => ({ ...c, color: CIRCLE_COLORS[i % CIRCLE_COLORS.length] }));
        setCircles(colored);
        setActiveCircleIdState((prev) => prev ?? colored[0]?.id ?? null);
      })
      .catch(() => {
        /* keep an empty list — the menu just won't show circles */
      });
    return () => {
      active = false;
    };
  }, []);

  const setRole = React.useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("role-view", newRole);
  }, []);

  const setActiveCircleId = React.useCallback(
    async (id: string) => {
      // Persist the cookie FIRST (fail-closed server validation), so any circle-scoped re-fetch
      // triggered by the state change below reads the new active circle, not the old one.
      const res = await setActiveCircle(id);
      if (!res.ok) return; // not a member — ignore the request
      setActiveCircleIdState(id);
      // Role + nav can differ per circle: re-resolve the user for the new active circle.
      const u = await getCurrentUser();
      setUser(u);
      if (u) setRoleState(u.role);
      // Refresh server components so any server-rendered, circle-scoped data re-resolves too.
      router.refresh();
    },
    [router],
  );

  const canAccessRoute = React.useCallback((href: string) => {
    const accessibleRoutes = roleNavAccess[role];
    return accessibleRoutes.some(route => href === route || href.startsWith(route + "/"));
  }, [role]);

  const signOut = React.useCallback(async () => {
    // Clear client-only state so the next user on this browser starts clean. The auth session
    // cookie itself is destroyed server-side by signOutAction (which then redirects to /sign-in).
    try {
      localStorage.removeItem("role-view");
      localStorage.removeItem("sidebar-collapsed");
    } catch {
      /* ignore storage access errors (private mode, etc.) */
    }
    setUser(null);
    await signOutAction();
  }, []);

  return (
    <AppShellContext.Provider
      value={{ role, setRole, canAccessRoute, user, userLoading, signOut, circles, activeCircleId, setActiveCircleId }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const context = React.useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return context;
}
