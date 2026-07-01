# TaDiff

TaDiff is a Next.js SaaS app for theatre and live performance companies.
It now covers the product surface from the reference site: public positioning,
profitability, CRM diffusion, grants, patronage, email campaigns, documents,
contracts, finance and billing.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase-ready auth, database and storage
- React Hook Form + Zod
- TanStack Table
- DnD Kit for the pipeline board

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env.local` when connecting external services.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

Without Supabase variables, the app uses mock data and demo auth messages.
Without Stripe or email variables, billing and campaigns stay in preview mode.

## Implemented

- Public landing page aligned with the TaDiff reference positioning
- Public pricing route with Solo, Pro and Studio plans
- Profitability calculator with break-even, margin, verdict and suggestions
- Login and signup forms with optional Supabase auth
- Dashboard cockpit with quick actions and prioritized work
- Shows, contacts, pipeline, relances and calendar
- Pipeline drag and drop, list view, editing, deletion and generated relances
- Cost profiles, commercial packs and quote data model
- Grants radar with deadlines and amounts
- Patronage pipeline with Loi Aillagon 60% argument
- Email campaign planning with templates and audience states
- Contracts, documents, finance and billing cockpit views
- Supabase SQL migrations with RLS policies

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Run the SQL files in order:
   - `sql/001_initial_schema.sql`
   - `sql/002_fix_company_signup_rls.sql`
   - `sql/003_workspace_rpc.sql`
   - `sql/004_pipeline_relances_v1.sql`
   - `sql/005_finance_growth_modules.sql`
5. Start the app with `npm run dev`.

## External Integrations

- Stripe is modeled in the billing module but not charged until keys and webhook handling are configured.
- Email campaigns are operational as planning objects; real sending needs an email provider key and a send action.
- FEC export is represented as a preview generated from quote/accounting lines; file export can be added on top of the current billing data.
