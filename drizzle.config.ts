import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Drizzle Kit config. `generate` works offline (no DB needed); `migrate`/`push`/`studio`
// require DATABASE_URL (set after provisioning Aurora — see SETUP.md).
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations/seed run as the admin (owner) connection; the app itself uses the
    // least-privilege role (DATABASE_URL) so RLS is enforced at runtime. See SETUP.md.
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
