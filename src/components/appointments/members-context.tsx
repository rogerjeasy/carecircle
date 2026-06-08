"use client";

import * as React from "react";
import type { Member } from "./types";

/**
 * Provides the active circle's real members (assignable to visits) + the care recipient's name to
 * the Appointments UI, so nested components don't need those props drilled through.
 */
interface ApptMembersValue {
  members: Member[];
  byId: (id: string | null | undefined) => Member | undefined;
  recipientName: string | null;
}

const ApptMembersContext = React.createContext<ApptMembersValue>({
  members: [],
  byId: () => undefined,
  recipientName: null,
});

export function ApptMembersProvider({
  members,
  recipientName,
  children,
}: {
  members: Member[];
  recipientName: string | null;
  children: React.ReactNode;
}) {
  const value = React.useMemo<ApptMembersValue>(
    () => ({
      members,
      byId: (id) => (id ? members.find((m) => m.id === id) : undefined),
      recipientName,
    }),
    [members, recipientName]
  );
  return <ApptMembersContext.Provider value={value}>{children}</ApptMembersContext.Provider>;
}

export function useApptMembers(): ApptMembersValue {
  return React.useContext(ApptMembersContext);
}
