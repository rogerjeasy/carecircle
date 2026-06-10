/**
 * Authorization-matrix tests — the application-layer half of CareCircle's fail-closed,
 * defense-in-depth model. Every server action re-checks one of these pure predicates against the
 * user's REAL membership role before mutating, and the same role lists are mirrored by the Aurora
 * RLS policies (drizzle/*_rls.sql) — the DB is the final backstop, these are the first gate.
 *
 * No AWS, no DB: these are pure functions over a role string.
 */
import { describe, it, expect } from 'vitest';

import { canManageMeds, canRecordDoses } from '@/lib/medications/access';
import { canManageDocs, DOC_RESTRICTED_ROLES } from '@/lib/documents/access';
import { canManageTasks } from '@/lib/tasks/access';
import { canManageAppointments } from '@/lib/appointments/access';
import { canManageRota } from '@/lib/rota/access';
import { canLogReadings, canManageAlertSettings } from '@/lib/health/access';
import { canContribute, canPostPrivate } from '@/lib/timeline/access';
import { canReportIncidents, canResolveIncidents } from '@/lib/incidents/access';
import { canGenerateDigest } from '@/lib/digest/access';
import { canManagePeople } from '@/lib/people/access';

/** Every role the system knows about (mirrors the `role` pg enum in src/db/schema/app.ts). */
const ALL_ROLES = [
  'owner',
  'family_admin',
  'family',
  'caregiver',
  'read_only',
  'care_recipient',
  'clinician',
] as const;

/** Assert a predicate is true for exactly `allowed` and false for every other known role. */
function expectExactly(
  predicate: (role: string | null | undefined) => boolean,
  allowed: readonly string[],
) {
  for (const role of ALL_ROLES) {
    expect(predicate(role), `${role} should be ${allowed.includes(role) ? 'allowed' : 'denied'}`).toBe(
      allowed.includes(role),
    );
  }
}

describe('authorization predicates are fail-closed', () => {
  // Every predicate in the app, including the two implemented as deny-lists ("any member except
  // read_only"): canLogReadings, canGenerateDigest.
  const ALL_PREDICATES = [
    canManageMeds,
    canRecordDoses,
    canManageDocs,
    canManageTasks,
    canManageAppointments,
    canManageRota,
    canLogReadings,
    canManageAlertSettings,
    canContribute,
    canPostPrivate,
    canReportIncidents,
    canResolveIncidents,
    canGenerateDigest,
    canManagePeople,
  ];

  // Allow-list predicates only — these reject any value not in their explicit role set, so even a
  // bogus non-enum string is denied. (The deny-list pair above trust the DB enum constraint, so a
  // non-enum string can never reach them at runtime; we don't assert against fabricated strings.)
  const ALLOWLIST_PREDICATES = [
    canManageMeds,
    canRecordDoses,
    canManageDocs,
    canManageTasks,
    canManageAppointments,
    canManageRota,
    canManageAlertSettings,
    canContribute,
    canPostPrivate,
    canReportIncidents,
    canResolveIncidents,
    canManagePeople,
  ];

  it.each([null, undefined, ''])('denies falsy input %p across every feature', (role) => {
    for (const p of ALL_PREDICATES) {
      expect(p(role as string)).toBe(false);
    }
  });

  it.each(['superuser', 'admin', 'ADMIN', 'Owner', 'root'])(
    'denies the unknown role %p for every allow-list predicate',
    (role) => {
      for (const p of ALLOWLIST_PREDICATES) {
        expect(p(role)).toBe(false);
      }
    },
  );
});

describe('medications', () => {
  it('only owner / family_admin may manage the medication list', () => {
    expectExactly(canManageMeds, ['owner', 'family_admin']);
  });

  it('the care team + the recipient may record a dose; read-only and clinician may not', () => {
    expectExactly(canRecordDoses, ['owner', 'family_admin', 'family', 'caregiver', 'care_recipient']);
  });

  it('a read-only relative can never manage meds or record doses', () => {
    expect(canManageMeds('read_only')).toBe(false);
    expect(canRecordDoses('read_only')).toBe(false);
  });
});

describe('documents vault', () => {
  it('care team + family may manage documents (caregiver included, read-only excluded)', () => {
    expectExactly(canManageDocs, ['owner', 'family_admin', 'family', 'caregiver']);
  });

  it('restricted-tier documents are visible only to coordinators + family', () => {
    // This list MUST match the rag_chunk / document RLS "restricted" branch
    // (drizzle/0015_documents_rls.sql, drizzle/0026_rag_chunks_rls.sql).
    expect([...DOC_RESTRICTED_ROLES].sort()).toEqual(['family', 'family_admin', 'owner']);
    expect(DOC_RESTRICTED_ROLES).not.toContain('caregiver');
    expect(DOC_RESTRICTED_ROLES).not.toContain('read_only');
  });
});

describe('coordination features', () => {
  it('tasks: care team + family may manage', () => {
    expectExactly(canManageTasks, ['owner', 'family_admin', 'family', 'caregiver']);
  });

  it('appointments: care team + family may manage', () => {
    expectExactly(canManageAppointments, ['owner', 'family_admin', 'family', 'caregiver']);
  });

  it('rota: coordinators + family only (not the hired aide)', () => {
    expectExactly(canManageRota, ['owner', 'family_admin', 'family']);
    expect(canManageRota('caregiver')).toBe(false);
  });

  it('people/roles: coordinators only', () => {
    expectExactly(canManagePeople, ['owner', 'family_admin']);
  });
});

describe('timeline', () => {
  it('contributors exclude read-only (and clinician)', () => {
    expect(canContribute('read_only')).toBe(false);
    expect(canContribute('caregiver')).toBe(true);
  });

  it('private notes are limited to coordinators + family', () => {
    expectExactly(canPostPrivate, ['owner', 'family_admin', 'family']);
    expect(canPostPrivate('caregiver')).toBe(false);
  });
});

describe('incidents', () => {
  it('reporting is broad (anyone present can raise one) but resolution is coordinators + family', () => {
    expect(canReportIncidents('caregiver')).toBe(true);
    expectExactly(canResolveIncidents, ['owner', 'family_admin', 'family']);
    expect(canResolveIncidents('caregiver')).toBe(false);
    expect(canResolveIncidents('read_only')).toBe(false);
  });
});

describe('vitals + digest', () => {
  it('a read-only relative cannot log vitals or generate a digest', () => {
    expect(canLogReadings('read_only')).toBe(false);
    expect(canGenerateDigest('read_only')).toBe(false);
  });

  it('alert safe ranges are editable by coordinators + family only (matches drizzle/0038)', () => {
    expectExactly(canManageAlertSettings, ['owner', 'family_admin', 'family']);
    expect(canManageAlertSettings('caregiver')).toBe(false);
  });
});
