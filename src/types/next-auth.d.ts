import type { DefaultSession } from 'next-auth';

// Add `id` to the session user so the DAL can scope RLS to it.
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}
