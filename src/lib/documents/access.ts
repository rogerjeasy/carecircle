import 'server-only';

/**
 * Server-side authorization for the Documents vault — enforced by the server actions and mirrored
 * by the DB RLS policies (drizzle/0015_documents_rls.sql). Checks the user's REAL membership role
 * in the active circle, never a client claim.
 *
 * Managing documents (upload / rename / delete / toggle emergency) is open to the care team +
 * family. Read visibility is sensitivity-tiered and enforced entirely in RLS (see that migration),
 * so there's no client read-gate to trust.
 */
export const DOC_MANAGE_ROLES = ['owner', 'family_admin', 'family', 'caregiver'] as const;

export function canManageDocs(dbRole: string | null | undefined): boolean {
  return !!dbRole && (DOC_MANAGE_ROLES as readonly string[]).includes(dbRole);
}

/** UI roles that can see restricted documents (used only for the role-based explainer banner). */
export const DOC_RESTRICTED_ROLES = ['owner', 'family_admin', 'family'] as const;
