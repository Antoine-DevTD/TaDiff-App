-- 039 - Acces progressif a William, quotas mensuels et credits IA

alter table public.companies
  add column if not exists ai_enabled boolean not null default false,
  add column if not exists ai_monthly_token_quota bigint not null default 0,
  add column if not exists ai_bonus_token_balance bigint not null default 0;

alter table public.profiles
  add column if not exists ai_access_enabled boolean not null default false;

update public.ai_settings
set model = 'deepseek-v4-flash', updated_at = now()
where provider = 'deepseek' and model in ('deepseek-chat', 'deepseek-reasoner');

alter table public.ai_settings drop constraint if exists ai_settings_provider_check;
alter table public.ai_settings
  add constraint ai_settings_provider_check
  check (provider in ('deepseek', 'openai', 'anthropic', 'mistral'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_ai_monthly_token_quota_check'
  ) then
    alter table public.companies
      add constraint companies_ai_monthly_token_quota_check
      check (ai_monthly_token_quota >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'companies_ai_bonus_token_balance_check'
  ) then
    alter table public.companies
      add constraint companies_ai_bonus_token_balance_check
      check (ai_bonus_token_balance >= 0);
  end if;
end;
$$;

create table if not exists public.ai_token_reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reserved_tokens bigint not null check (reserved_tokens > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid unique references public.ai_token_reservations(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('deepseek', 'openai', 'anthropic', 'mistral')),
  model text not null,
  request_kind text not null default 'chat',
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  total_tokens bigint generated always as (input_tokens + output_tokens) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchased_by uuid references auth.users(id) on delete set null,
  token_amount bigint not null check (token_amount > 0),
  amount_paid integer not null default 0 check (amount_paid >= 0),
  currency text not null default 'eur',
  stripe_checkout_session_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_company_month_idx
  on public.ai_usage_events(company_id, created_at desc);
create index if not exists ai_usage_events_user_month_idx
  on public.ai_usage_events(user_id, created_at desc);
create index if not exists ai_token_reservations_active_idx
  on public.ai_token_reservations(company_id, created_at)
  where status = 'reserved';

alter table public.ai_token_reservations enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_credit_purchases enable row level security;

create policy "members read company ai reservations"
  on public.ai_token_reservations for select
  to authenticated
  using (public.is_company_member(company_id) or (select public.is_super_admin_user()));

create policy "members read company ai usage"
  on public.ai_usage_events for select
  to authenticated
  using (public.is_company_member(company_id) or (select public.is_super_admin_user()));

create policy "managers read company ai purchases"
  on public.ai_credit_purchases for select
  to authenticated
  using (
    (public.is_company_member(company_id) and public.current_company_role() in ('owner', 'admin'))
    or (select public.is_super_admin_user())
  );

create or replace function public.get_my_ai_entitlement()
returns table (
  enabled boolean,
  is_unlimited boolean,
  monthly_quota bigint,
  monthly_used bigint,
  bonus_balance bigint,
  remaining_tokens bigint,
  period_started_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with identity as (
    select
      p.company_id,
      p.ai_access_enabled,
      p.is_super_admin,
      c.ai_enabled as company_ai_enabled,
      c.ai_monthly_token_quota,
      c.ai_bonus_token_balance
    from public.profiles p
    join public.companies c on c.id = p.company_id
    where p.id = auth.uid()
  ), usage as (
    select coalesce(sum(e.total_tokens), 0)::bigint as used
    from public.ai_usage_events e
    join identity i on i.company_id = e.company_id
    where e.created_at >= date_trunc('month', now())
  ), settings as (
    select coalesce((select a.enabled from public.ai_settings a where a.id = true), false) as globally_enabled
  )
  select
    s.globally_enabled and (i.is_super_admin or (i.company_ai_enabled and i.ai_access_enabled)),
    i.is_super_admin,
    i.ai_monthly_token_quota,
    u.used,
    i.ai_bonus_token_balance,
    case
      when i.is_super_admin then -1
      else greatest(i.ai_monthly_token_quota - u.used, 0) + i.ai_bonus_token_balance
    end,
    date_trunc('month', now())
  from identity i
  cross join usage u
  cross join settings s;
$$;

create or replace function public.reserve_my_ai_tokens(p_requested_tokens bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_company uuid;
  caller_allowed boolean;
  caller_super boolean;
  quota bigint;
  bonus bigint;
  consumed bigint;
  reserved bigint;
  reservation_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentification requise.';
  end if;

  if p_requested_tokens < 1 or p_requested_tokens > 200000 then
    raise exception 'Budget de tokens invalide.';
  end if;

  if not coalesce((select enabled from public.ai_settings where id = true), false) then
    raise exception 'William est desactive globalement.';
  end if;

  select p.company_id,
         p.is_super_admin,
         p.is_super_admin or (c.ai_enabled and p.ai_access_enabled),
         c.ai_monthly_token_quota,
         c.ai_bonus_token_balance
  into caller_company, caller_super, caller_allowed, quota, bonus
  from public.profiles p
  join public.companies c on c.id = p.company_id
  where p.id = caller_id
  for update of c;

  if caller_company is null or not coalesce(caller_allowed, false) then
    raise exception 'William n est pas active pour ce compte.';
  end if;

  update public.ai_token_reservations
  set status = 'released', finalized_at = now()
  where company_id = caller_company
    and status = 'reserved'
    and created_at < now() - interval '15 minutes';

  select coalesce(sum(total_tokens), 0)::bigint
  into consumed
  from public.ai_usage_events
  where company_id = caller_company
    and created_at >= date_trunc('month', now());

  select coalesce(sum(reserved_tokens), 0)::bigint
  into reserved
  from public.ai_token_reservations
  where company_id = caller_company
    and status = 'reserved';

  if not caller_super and quota + bonus - consumed - reserved < p_requested_tokens then
    raise exception 'Quota William insuffisant.';
  end if;

  insert into public.ai_token_reservations(company_id, user_id, reserved_tokens)
  values (caller_company, caller_id, p_requested_tokens)
  returning id into reservation_id;

  return reservation_id;
end;
$$;

create or replace function public.finalize_ai_token_reservation(
  p_reservation_id uuid,
  p_provider text,
  p_model text,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_request_kind text default 'chat'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation public.ai_token_reservations%rowtype;
  quota bigint;
  used_before bigint;
  actual_total bigint;
  bonus_debit bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Action reservee au serveur.';
  end if;

  if p_provider not in ('deepseek', 'openai', 'anthropic', 'mistral')
    or p_input_tokens < 0 or p_output_tokens < 0 then
    raise exception 'Consommation IA invalide.';
  end if;

  select * into reservation
  from public.ai_token_reservations
  where id = p_reservation_id
  for update;

  if reservation.id is null or reservation.status <> 'reserved' then
    raise exception 'Reservation IA introuvable ou deja finalisee.';
  end if;

  actual_total := p_input_tokens + p_output_tokens;

  select ai_monthly_token_quota into quota
  from public.companies
  where id = reservation.company_id
  for update;

  select coalesce(sum(total_tokens), 0)::bigint into used_before
  from public.ai_usage_events
  where company_id = reservation.company_id
    and created_at >= date_trunc('month', now());

  bonus_debit := greatest(used_before + actual_total - quota, 0)
    - greatest(used_before - quota, 0);

  if bonus_debit > 0 then
    update public.companies
    set ai_bonus_token_balance = greatest(ai_bonus_token_balance - bonus_debit, 0)
    where id = reservation.company_id;
  end if;

  insert into public.ai_usage_events(
    reservation_id, company_id, user_id, provider, model, request_kind, input_tokens, output_tokens
  ) values (
    reservation.id, reservation.company_id, reservation.user_id, p_provider, p_model,
    coalesce(nullif(p_request_kind, ''), 'chat'), p_input_tokens, p_output_tokens
  );

  update public.ai_token_reservations
  set status = 'consumed', finalized_at = now()
  where id = reservation.id;
end;
$$;

create or replace function public.release_ai_token_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Action reservee au serveur.';
  end if;

  update public.ai_token_reservations
  set status = 'released', finalized_at = now()
  where id = p_reservation_id and status = 'reserved';
end;
$$;

create or replace function public.grant_ai_credit_purchase(
  p_company_id uuid,
  p_purchased_by uuid,
  p_token_amount bigint,
  p_amount_paid integer,
  p_currency text,
  p_stripe_checkout_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Action reservee au serveur.';
  end if;

  insert into public.ai_credit_purchases(
    company_id, purchased_by, token_amount, amount_paid, currency, stripe_checkout_session_id
  ) values (
    p_company_id, p_purchased_by, p_token_amount, p_amount_paid,
    lower(coalesce(nullif(p_currency, ''), 'eur')), p_stripe_checkout_session_id
  )
  on conflict (stripe_checkout_session_id) do nothing;

  if found then
    update public.companies
    set ai_bonus_token_balance = ai_bonus_token_balance + p_token_amount
    where id = p_company_id;
  end if;
end;
$$;

drop function if exists public.admin_list_ai_accounts();
create function public.admin_list_ai_accounts()
returns table (
  user_id uuid,
  email text,
  full_name text,
  company_id uuid,
  company_name text,
  company_ai_enabled boolean,
  user_ai_enabled boolean,
  is_super_admin boolean,
  role text,
  monthly_quota bigint,
  monthly_used bigint,
  bonus_balance bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    u.email::text,
    coalesce(p.full_name, ''),
    c.id,
    c.name,
    c.ai_enabled,
    p.ai_access_enabled,
    p.is_super_admin,
    p.role,
    c.ai_monthly_token_quota,
    coalesce((
      select sum(e.total_tokens)::bigint
      from public.ai_usage_events e
      where e.company_id = c.id
        and e.created_at >= date_trunc('month', now())
    ), 0),
    c.ai_bonus_token_balance
  from public.profiles p
  join public.companies c on c.id = p.company_id
  left join auth.users u on u.id = p.id
  where public.is_super_admin_user()
  order by c.name, p.is_super_admin desc, p.created_at;
$$;

create or replace function public.admin_set_company_ai(
  p_company_id uuid,
  p_enabled boolean,
  p_monthly_quota bigint,
  p_bonus_balance bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin_user() then
    raise exception 'Acces reserve aux super admins.';
  end if;
  if p_monthly_quota < 0 or p_bonus_balance < 0 then
    raise exception 'Les quotas ne peuvent pas etre negatifs.';
  end if;

  update public.companies
  set ai_enabled = p_enabled,
      ai_monthly_token_quota = p_monthly_quota,
      ai_bonus_token_balance = p_bonus_balance
  where id = p_company_id;
end;
$$;

create or replace function public.admin_set_user_ai_access(p_user_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin_user() then
    raise exception 'Acces reserve aux super admins.';
  end if;

  update public.profiles
  set ai_access_enabled = p_enabled
  where id = p_user_id;
end;
$$;

grant execute on function public.get_my_ai_entitlement() to authenticated;
grant execute on function public.reserve_my_ai_tokens(bigint) to authenticated;
grant execute on function public.admin_list_ai_accounts() to authenticated;
grant execute on function public.admin_set_company_ai(uuid, boolean, bigint, bigint) to authenticated;
grant execute on function public.admin_set_user_ai_access(uuid, boolean) to authenticated;

revoke all on function public.get_my_ai_entitlement() from public, anon;
revoke all on function public.reserve_my_ai_tokens(bigint) from public, anon;
revoke all on function public.admin_list_ai_accounts() from public, anon;
revoke all on function public.admin_set_company_ai(uuid, boolean, bigint, bigint) from public, anon;
revoke all on function public.admin_set_user_ai_access(uuid, boolean) from public, anon;

revoke all on function public.finalize_ai_token_reservation(uuid, text, text, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.release_ai_token_reservation(uuid) from public, anon, authenticated;
revoke all on function public.grant_ai_credit_purchase(uuid, uuid, bigint, integer, text, text) from public, anon, authenticated;
grant execute on function public.finalize_ai_token_reservation(uuid, text, text, bigint, bigint, text) to service_role;
grant execute on function public.release_ai_token_reservation(uuid) to service_role;
grant execute on function public.grant_ai_credit_purchase(uuid, uuid, bigint, integer, text, text) to service_role;

grant select on public.ai_token_reservations, public.ai_usage_events, public.ai_credit_purchases to authenticated;
