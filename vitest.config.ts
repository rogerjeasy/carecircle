import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Vitest config for Kintwadi.
 *
 * - `@/…` resolves to ./src (mirrors tsconfig paths).
 * - `server-only` is stubbed: the npm package throws when imported outside an RSC bundle, but our
 *   access-control modules import it for safety. The stub lets us unit-test those pure functions.
 * - Node environment; no real AWS or network calls in the default (unit) run.
 */
export default defineConfig({
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The RLS integration suite self-skips unless TEST_DATABASE_URL is set, so it's safe to include.
    testTimeout: 30_000,
  },
});
