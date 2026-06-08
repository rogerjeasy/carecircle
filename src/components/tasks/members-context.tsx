"use client";

import * as React from "react";
import type { Member } from "./types";

/**
 * Provides the active circle's real members to the Tasks UI (assignee picker, fair-share chart,
 * task-card avatars) so deeply-nested components don't need the members prop drilled through.
 */
interface TaskMembersValue {
  members: Member[];
  byId: (id: string | null | undefined) => Member | undefined;
}

const TaskMembersContext = React.createContext<TaskMembersValue>({ members: [], byId: () => undefined });

export function TaskMembersProvider({ members, children }: { members: Member[]; children: React.ReactNode }) {
  const value = React.useMemo<TaskMembersValue>(
    () => ({
      members,
      byId: (id) => (id ? members.find((m) => m.id === id) : undefined),
    }),
    [members]
  );
  return <TaskMembersContext.Provider value={value}>{children}</TaskMembersContext.Provider>;
}

export function useTaskMembers(): TaskMembersValue {
  return React.useContext(TaskMembersContext);
}
