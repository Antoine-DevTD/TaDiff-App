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
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BETA_MONTHLY=
STRIPE_PRICE_SOLO_MONTHLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_STUDIO_MONTHLY=
RESEND_API_KEY=

TADIFF_MAINTENANCE_MODE=false
TADIFF_MAINTENANCE_ALLOWED_IPS=
TADIFF_MAINTENANCE_BYPASS_TOKEN=
```

Without Supabase variables, the app uses mock data and demo auth messages.
Without Stripe or email variables, billing and campaigns stay in preview mode.
Stripe webhooks require `SUPABASE_SERVICE_ROLE_KEY`; this key must stay server-side only.

## Access Audit and Maintenance

Apply `sql/021_access_audit_and_maintenance.sql` to enable authenticated access logs
in `/admin`. The audit route records login, signup and dashboard page views with account,
company, IP address, user agent and path.

Apply `sql/022_maintenance_toggle.sql` to enable the maintenance switch. Maintenance mode
is disabled by default and can be toggled instantly from `/admin` (no redeploy) — this
is the normal way to turn it on or off.

`TADIFF_MAINTENANCE_MODE` is an emergency override that stays available via env var
(takes priority over the DB flag, requires a redeploy to change). To keep access for
selected devices during maintenance, set:

```txt
TADIFF_MAINTENANCE_ALLOWED_IPS=1.2.3.4
TADIFF_MAINTENANCE_BYPASS_TOKEN=<long-random-token>
```

An allowed device can then open:

```txt
https://your-domain.example/?maintenance_token=<long-random-token>
```

The token is stored in an HTTP-only cookie for 14 days. Visitors without matching IP
or token see `/maintenance`, whether maintenance mode was turned on from `/admin` or
via `TADIFF_MAINTENANCE_MODE`.

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
4. Run the SQL files in order from `sql/001_initial_schema.sql` to the latest numbered migration.
5. Start the app with `npm run dev`.

## External Integrations

- Stripe Checkout is wired for subscription test mode. Create test products/prices in Stripe,
  set `STRIPE_PRICE_BETA_MONTHLY`, then point the webhook to `/api/stripe/webhook`.
  The webhook synchronizes `companies.billing_status`.
- Email campaigns are operational as planning objects; real sending needs an email provider key and a send action.
- FEC export is represented as a preview generated from quote/accounting lines; file export can be added on top of the current billing data.

## Supabase Heartbeat

The repository includes `.github/workflows/supabase-heartbeat.yml`.
It runs every Tuesday and Friday at 10:00 Europe/Paris and calls:

```txt
GET /rest/v1/companies?select=id&limit=1
```

Create these GitHub repository secrets before relying on it:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
```

The workflow also supports manual runs from the GitHub Actions tab.
