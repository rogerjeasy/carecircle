"use client";

import * as React from "react";
import type { Member } from "./types";

/**
 * Provides the active circle's members (for the shift assignee picker, blocks, and on-call banner)
 * to the Rota UI, so nested components don't need the members prop drilled through.
 */
interface RotaMembersValue {
  members: Member[];
  byId: (id: string | null | undefined) => Member | undefined;
}

const RotaMembersContext = React.createContext<RotaMembersValue>({ members: [], byId: () => undefined });

export function RotaMembersProvider({ members, children }: { members: Member[]; children: React.ReactNode }) {
  const value = React.useMemo<RotaMembersValue>(
    () => ({ members, byId: (id) => (id ? members.find((m) => m.id === id) : undefined) }),
    [members]
  );
  return <RotaMembersContext.Provider value={value}>{children}</RotaMembersContext.Provider>;
}

export function useRotaMembers(): RotaMembersValue {
  return React.useContext(RotaMembersContext);
}
