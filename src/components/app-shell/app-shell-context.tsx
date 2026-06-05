"use client";

import * as React from "react";

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

interface AppShellContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  canAccessRoute: (href: string) => boolean;
}

const AppShellContext = React.createContext<AppShellContextValue | undefined>(undefined);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<UserRole>("coordinator");

  // Load role from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem("role-view");
    if (stored && stored in roleLabels) {
      setRoleState(stored as UserRole);
    }
  }, []);

  const setRole = React.useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("role-view", newRole);
  }, []);

  const canAccessRoute = React.useCallback((href: string) => {
    const accessibleRoutes = roleNavAccess[role];
    return accessibleRoutes.some(route => href === route || href.startsWith(route + "/"));
  }, [role]);

  return (
    <AppShellContext.Provider value={{ role, setRole, canAccessRoute }}>
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
