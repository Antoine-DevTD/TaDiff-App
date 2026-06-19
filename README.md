# TaDiff

TaDiff is a Next.js SaaS foundation for theatre and live performance companies.
The current foundation includes the public landing page, mock authenticated shell,
dashboard, first Supabase-ready data layer, typed forms and CRM table.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase prepared for auth, database and storage
- React Hook Form + Zod
- TanStack Table
- Vercel-ready deployment target

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
```

## Environment

Copy `.env.example` to `.env.local` when Supabase is introduced.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Without these Supabase variables, the app falls back to mock data and demo auth messages.

## Project Structure

```txt
app/
  (public)/       public marketing pages
  (auth)/         visual login and signup pages
  (dashboard)/    mock connected app shell
components/
  layout/         sidebar, topbar and public header
  ui/             shared UI primitives
data/             mock data used before Supabase
lib/              constants and utilities
public/           PWA manifest and icons
sql/              Supabase scripts
types/            shared TypeScript types
```

## Implemented

- Public landing page and pricing route
- Login and signup forms with local validation and optional Supabase auth
- Mock dashboard layout with sidebar and topbar
- Dashboard page using mock data or Supabase fallback queries
- Shows and contacts pages
- Contact table using TanStack Table
- Show/contact forms using React Hook Form and Zod
- Base UI components
- PWA manifest and placeholder icon
- Initial Supabase SQL schema with RLS

Not implemented yet:

- Persisted CRUD mutations
- Kanban drag and drop
- Calendar
- Payments

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Run `sql/001_initial_schema.sql` in the Supabase SQL Editor.
5. Start the app with `npm run dev`.
Deployment initialized on Vercel.
