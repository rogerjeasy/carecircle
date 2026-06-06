<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🔒 Security invariants — ALWAYS enforce these (non-negotiable, for the entire project)

Authentication and authorization are **defense-in-depth and fail-closed**. Never weaken any layer.

1. **Every authenticated page lives under `src/app/(app)/`.** That route group's `layout.tsx`
   runs `requireSession()` on the server and redirects unauthenticated users to `/sign-in`.
   Protection is the DEFAULT — do NOT add a per-page opt-in. Public pages (marketing, `/sign-in`,
   `/sign-up`, `/forgot-password`, `/reset-password`, `/pricing`, `/how-it-works`, `/invite/*`,
   `/style-guide`) live OUTSIDE the group. When you create a new app screen, put it under
   `(app)/` — then it is secured automatically.
2. **`proxy.ts` is fail-closed:** every route is gated unless explicitly listed in its public
   allowlist. If you add a genuinely public route, add it there; otherwise it stays protected.
   This is only the optimistic edge layer — never the sole guard.
3. **All tenant data access goes through `withAuthedDb()`** (src/db/dal.ts), which runs queries
   inside an RLS-scoped transaction (`app.current_user_id`). Never query tenant tables with the
   raw `db` client in a request handler. Aurora Row-Level Security is the final guarantee that a
   user can only read/write rows in care circles they belong to.
4. **Server actions and route handlers must re-check auth themselves** (`requireSession()` /
   `auth()`), and authorize the specific action against the user's role/membership. Never trust
   the client or assume the proxy/layout already ran for a mutation.
5. **Secrets stay server-side**, in env vars (never committed). Passwords are hashed
   (`src/lib/password.ts`); reset tokens are stored hashed and are single-use + short-lived.
6. **Audit every sensitive / state-changing action for traceability — everywhere, including all
   incoming features.** Use the primitive `recordAuditEvent(userId, { circleId, action,
   entityType, entityId, summary }, tx?)` from `src/db/audit.ts`. The append-only `audit_log` is
   immutable (no UPDATE/DELETE policy). Rules of thumb:
   - Any create/update/delete/give/assign/complete, any view/export of sensitive data
     (documents, audit log), invites and role changes, sign-in/out → write an audit row.
   - For multi-step transactions (e.g. "give a medication"), pass the same `tx` so the audit
     write commits atomically WITH the action.
   - Never log secrets/PII in plaintext (server logs OR audit summaries). Sensitive server
     actions take `FormData` (not plain objects) so Next's dev logger can't print passwords.
     The Auth.js `logger` is sanitized to never print error `cause` (which can carry SQL/PII).
   - **Two complementary trails — EVERY server action & route handler MUST emit both as applicable:**
     1. **Operational log (always):** call `serverLog(area, action, 'start'|'success'|'failure', meta)`
        from `src/lib/log.ts` on the success AND failure paths — including actions with no circle yet
        (sign-up, password reset) and errors that never reach the ledger. Use `maskEmail()`; log
        ids/counts/reasons, never raw PII/secrets/tokens.
     2. **Durable audit (when it changed tenant data in a known circle):** `recordAuditEvent(...)`
        as above. This is what the platform admin sees in the append-only ledger at `/admin/audit`
        (wired to the real `audit_log` via `getRecentAuditEvents` on the privileged path).
     A new feature is not "done" until both are in place. If an action can't reach a circle, still
     `serverLog` it. Best-effort side-effects (email/SNS) log their own success/failure and never
     throw into the action that triggered them.

If a change would bypass any of the above, stop and flag it instead of shipping it.

### Platform super-admin (cross-tenant)
The `/admin` console is for CareCircle staff who see ACROSS all circles — this deliberately
crosses the per-circle RLS boundary, so treat it as high-risk. Access is an email allowlist
(`PLATFORM_ADMIN_EMAILS`), NOT a circle role. Gate every admin route/page/action with
`requirePlatformAdmin()` (src/db/dal.ts), which layers on top of `requireSession()`. Admin pages
live under `src/app/(app)/admin/` so both guards run. When wiring real cross-tenant reads later,
do it through a privileged, AUDITED path (record the admin access) — never expose tenant data
without logging who viewed it.

### Logging hygiene (applies to every log statement)
Catch-and-log sanitized: log error `name`/`code` only, never the raw error object, query text,
params, tokens, passwords, or email/PII. Pattern: `console.error('[area] failed:', err?.name)`.
