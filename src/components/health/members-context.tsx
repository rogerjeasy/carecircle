"use client";

import * as React from "react";
import type { Member } from "./types";

/**
 * Provides the active circle's members (for the "recorded by" picker + readings table) and the
 * signed-in user's membership id to the Health UI, so nested components don't need props drilled.
 */
interface HealthMembersValue {
  members: Member[];
  byId: (id: string | null | undefined) => Member | undefined;
  currentMembershipId: string | null;
}

const HealthMembersContext = React.createContext<HealthMembersValue>({
  members: [],
  byId: () => undefined,
  currentMembershipId: null,
});

export function HealthMembersProvider({
  members,
  currentMembershipId,
  children,
}: {
  members: Member[];
  currentMembershipId: string | null;
  children: React.ReactNode;
}) {
  const value = React.useMemo<HealthMembersValue>(
    () => ({
      members,
      byId: (id) => (id ? members.find((m) => m.id === id) : undefined),
      currentMembershipId,
    }),
    [members, currentMembershipId]
  );
  return <HealthMembersContext.Provider value={value}>{children}</HealthMembersContext.Provider>;
}

export function useHealthMembers(): HealthMembersValue {
  return React.useContext(HealthMembersContext);
}
