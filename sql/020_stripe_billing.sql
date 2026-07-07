-- 020 - Stripe billing test mode
-- Stores Stripe customer/subscription handles on companies so webhooks can
-- synchronize access without exposing billing columns to the browser.

alter table public.companies
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_current_period_end timestamptz;

create unique index if not exists companies_stripe_customer_id_idx
  on public.companies(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists companies_stripe_subscription_id_idx
  on public.companies(stripe_subscription_id)
  where stripe_subscription_id is not null;
