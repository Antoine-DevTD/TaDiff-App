Supabase is prepared but optional during local development.

Files:
- `client.ts` creates the browser client lazily.
- `server.ts` creates the server client lazily with Next.js cookies.
- `queries.ts` reads Supabase when env vars exist, otherwise returns mock data.

Run `sql/001_initial_schema.sql` in Supabase SQL Editor to create the first schema.
