-- 088 — Checkout sérialisé et synchronisation Stripe rejouable.
-- À appliquer après 087. Aucun changement des droits des compagnies existantes.
alter table public.companies add column if not exists stripe_last_event_created bigint;

create table if not exists public.stripe_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  plan_code text not null,
  price_id text not null,
  customer_id text,
  session_id text unique,
  session_url text,
  expires_at timestamptz,
  status text not null default 'creating' check(status in ('creating','open','completed','expired')),
  created_at timestamptz not null default now()
);
create unique index if not exists stripe_checkout_one_open_per_company
  on public.stripe_checkout_attempts(company_id) where status in ('creating','open');
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_created bigint not null,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_checkout_attempts enable row level security;
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_checkout_attempts,public.stripe_webhook_events from public,anon,authenticated;
grant all on public.stripe_checkout_attempts,public.stripe_webhook_events to service_role;

create or replace function public.prepare_stripe_checkout(p_company_id uuid,p_actor_id uuid,p_plan_code text,p_price_id text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare c companies%rowtype; a stripe_checkout_attempts%rowtype;
begin
  select * into c from companies where id=p_company_id for update;
  if not found or not exists(select 1 from profiles p join auth.users u on u.id=p.id
    where p.id=p_actor_id and p.company_id=p_company_id and p.role in ('owner','admin') and u.email_confirmed_at is not null)
    then return jsonb_build_object('ok',false,'status','forbidden'); end if;
  if p_plan_code not in ('beta','solo','pro','studio') or nullif(p_price_id,'') is null
    or (c.billing_status='pending_payment' and p_plan_code<>'beta')
    then return jsonb_build_object('ok',false,'status','invalid_price'); end if;
  select * into a from stripe_checkout_attempts where company_id=c.id and status in ('creating','open');
  if c.billing_status='active' or (c.stripe_subscription_id is not null and a.id is null)
    then return jsonb_build_object('ok',false,'status','existing_subscription'); end if;
  if found and (a.price_id<>p_price_id or a.plan_code<>p_plan_code) then
    return jsonb_build_object('ok',false,'status','existing_checkout');
  end if;
  -- A creating attempt is never timed out locally: a lost Stripe response must
  -- be recovered with the same idempotency key, not a second subscription.
  if a.id is null then
    insert into stripe_checkout_attempts(company_id,actor_id,plan_code,price_id,customer_id)
      values(c.id,p_actor_id,p_plan_code,p_price_id,c.stripe_customer_id) returning * into a;
  end if;
  return jsonb_build_object('ok',true,'attemptId',a.id,'customerId',coalesce(a.customer_id,c.stripe_customer_id),
    'sessionId',a.session_id,'sessionUrl',a.session_url,'createdAt',a.created_at);
end; $$;

create or replace function public.bind_stripe_checkout_customer(p_attempt_id uuid,p_customer_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a stripe_checkout_attempts%rowtype; c companies%rowtype;
begin
  select * into a from stripe_checkout_attempts where id=p_attempt_id;
  if not found or nullif(p_customer_id,'') is null then return jsonb_build_object('ok',false); end if;
  select * into c from companies where id=a.company_id for update;
  select * into a from stripe_checkout_attempts where id=p_attempt_id for update;
  if a.status not in ('creating','open') or (c.stripe_customer_id is not null and c.stripe_customer_id<>p_customer_id)
    then return jsonb_build_object('ok',false); end if;
  update companies set stripe_customer_id=p_customer_id where id=c.id;
  update stripe_checkout_attempts set customer_id=p_customer_id where id=a.id;
  return jsonb_build_object('ok',true);
end; $$;

create or replace function public.finish_stripe_checkout(p_attempt_id uuid,p_session_id text,p_url text,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a stripe_checkout_attempts%rowtype;
begin
  select * into a from stripe_checkout_attempts where id=p_attempt_id;
  if not found then return jsonb_build_object('ok',false); end if;
  perform id from companies where id=a.company_id for update;
  select * into a from stripe_checkout_attempts where id=p_attempt_id for update;
  if a.status not in ('creating','open') or (a.session_id is not null and a.session_id<>p_session_id)
    or nullif(p_session_id,'') is null or nullif(p_url,'') is null then return jsonb_build_object('ok',false); end if;
  update stripe_checkout_attempts set session_id=p_session_id,session_url=p_url,expires_at=p_expires_at,status='open' where id=a.id;
  return jsonb_build_object('ok',true);
end; $$;

create or replace function public.expire_stripe_checkout(p_attempt_id uuid,p_session_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a stripe_checkout_attempts%rowtype;
begin
  select * into a from stripe_checkout_attempts where id=p_attempt_id;
  if not found then return jsonb_build_object('ok',false); end if;
  perform id from companies where id=a.company_id for update;
  update stripe_checkout_attempts set status='expired',session_id=p_session_id
    where id=a.id and status in ('creating','open') and (session_id is null or session_id=p_session_id);
  return jsonb_build_object('ok',found);
end; $$;

create or replace function public.apply_stripe_billing_event(
  p_event_id text,p_event_created bigint,p_event_type text,p_company_id uuid,p_customer_id text,
  p_subscription_id text,p_price_id text,p_plan_code text,p_status text,p_payment_confirmed boolean,p_current_period_end timestamptz,
  p_checkout_attempt_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare c companies%rowtype; next_status text;
begin
  if nullif(p_event_id,'') is null or p_event_created is null or p_event_created<0 or p_status is null
    or p_payment_confirmed is null or p_status not in ('active','pending_payment','past_due','cancelled')
    or nullif(p_customer_id,'') is null or nullif(p_subscription_id,'') is null or nullif(p_price_id,'') is null
    then raise exception 'Invalid Stripe event'; end if;
  select * into c from companies where id=p_company_id for update;
  if not found then raise exception 'Unknown company'; end if;
  if c.stripe_customer_id is distinct from p_customer_id
    or (c.stripe_subscription_id is not null and c.stripe_subscription_id<>p_subscription_id)
    then return jsonb_build_object('ok',true,'status','unrelated'); end if;
  if c.billing_status='pending_payment' and c.stripe_subscription_id is null and not exists(
    select 1 from stripe_checkout_attempts where id=p_checkout_attempt_id and company_id=c.id and customer_id=p_customer_id
      and price_id=p_price_id and plan_code='beta' and status in ('creating','open','completed'))
    then return jsonb_build_object('ok',true,'status','unrelated'); end if;
  insert into stripe_webhook_events(event_id,company_id,event_created,event_type)
    values(p_event_id,c.id,p_event_created,p_event_type) on conflict(event_id) do nothing;
  if not found then return jsonb_build_object('ok',true,'status','duplicate'); end if;
  if p_event_created<coalesce(c.stripe_last_event_created,-1) then return jsonb_build_object('ok',true,'status','stale'); end if;
  -- At equal timestamps an already cancelled subscription cannot be reopened
  -- by a concurrently fetched older snapshot.
  if p_event_created=c.stripe_last_event_created and c.billing_status='cancelled' and p_status<>'cancelled'
    then return jsonb_build_object('ok',true,'status','stale'); end if;
  next_status:=p_status;
  if p_status='active' and not p_payment_confirmed then next_status:=c.billing_status; end if;
  if p_status='pending_payment' then next_status:=c.billing_status; end if;
  if c.billing_status='pending_payment' and not (p_status='active' and p_payment_confirmed) then next_status:='pending_payment'; end if;
  -- An offered access is an independent admin decision. Payment failures cannot
  -- take it away; an actual paid subscription may replace it.
  if c.billing_status='comped' and not (p_status='active' and p_payment_confirmed) then next_status:='comped'; end if;
  update companies set billing_status=next_status,plan_code=coalesce(nullif(p_plan_code,''),plan_code),
    stripe_subscription_id=case when c.billing_status='pending_payment' and p_status='cancelled' then null else p_subscription_id end,
    stripe_price_id=p_price_id,
    stripe_current_period_end=p_current_period_end,stripe_last_event_created=p_event_created,
    billing_notes=case when p_payment_confirmed then 'Paiement Stripe confirmé.' else 'Statut Stripe synchronisé.' end
    where id=c.id;
  if c.billing_status='pending_payment' and p_status='cancelled' then
    update stripe_checkout_attempts set status='expired' where id=p_checkout_attempt_id and company_id=c.id and status in ('creating','open');
  end if;
  if p_status='active' and p_payment_confirmed then
    update stripe_checkout_attempts set status='completed' where company_id=c.id and customer_id=p_customer_id and status in ('creating','open');
  end if;
  return jsonb_build_object('ok',true,'status','applied');
end; $$;

revoke all on function public.prepare_stripe_checkout(uuid,uuid,text,text),public.bind_stripe_checkout_customer(uuid,text),
  public.finish_stripe_checkout(uuid,text,text,timestamptz),public.expire_stripe_checkout(uuid,text),
  public.apply_stripe_billing_event(text,bigint,text,uuid,text,text,text,text,text,boolean,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.prepare_stripe_checkout(uuid,uuid,text,text),public.bind_stripe_checkout_customer(uuid,text),
  public.finish_stripe_checkout(uuid,text,text,timestamptz),public.expire_stripe_checkout(uuid,text),
  public.apply_stripe_billing_event(text,bigint,text,uuid,text,text,text,text,text,boolean,timestamptz,uuid) to service_role;
