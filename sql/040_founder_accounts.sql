-- 040 - Compte fondateur operationnel avec quota William personnel

alter table public.profiles
  add column if not exists is_founder boolean not null default false;

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
      p.id as user_id,
      p.company_id,
      p.ai_access_enabled,
      p.is_super_admin,
      p.is_founder,
      c.ai_enabled as company_ai_enabled,
      c.ai_monthly_token_quota,
      c.ai_bonus_token_balance
    from public.profiles p
    join public.companies c on c.id = p.company_id
    where p.id = auth.uid()
  ), usage as (
    select coalesce(sum(e.total_tokens), 0)::bigint as used
    from public.ai_usage_events e
    join public.profiles actor on actor.id = e.user_id
    join identity i on
      (i.is_founder and e.user_id = i.user_id)
      or (not i.is_founder and not actor.is_founder and e.company_id = i.company_id)
    where e.created_at >= date_trunc('month', now())
  ), settings as (
    select coalesce((select a.enabled from public.ai_settings a where a.id = true), false) as globally_enabled
  )
  select
    s.globally_enabled and (
      i.is_super_admin
      or i.is_founder
      or (i.company_ai_enabled and i.ai_access_enabled)
    ),
    i.is_super_admin,
    case when i.is_founder then 5000000::bigint else i.ai_monthly_token_quota end,
    u.used,
    case when i.is_founder then 0::bigint else i.ai_bonus_token_balance end,
    case
      when i.is_super_admin then -1
      when i.is_founder then greatest(5000000::bigint - u.used, 0)
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
  caller_founder boolean;
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
         p.is_founder,
         p.is_super_admin or p.is_founder or (c.ai_enabled and p.ai_access_enabled),
         case when p.is_founder then 5000000::bigint else c.ai_monthly_token_quota end,
         case when p.is_founder then 0::bigint else c.ai_bonus_token_balance end
  into caller_company, caller_super, caller_founder, caller_allowed, quota, bonus
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
  from public.ai_usage_events e
  join public.profiles actor on actor.id = e.user_id
  where (case when caller_founder then e.user_id = caller_id else e.company_id = caller_company and not actor.is_founder end)
    and e.created_at >= date_trunc('month', now());

  select coalesce(sum(reserved_tokens), 0)::bigint
  into reserved
  from public.ai_token_reservations r
  join public.profiles actor on actor.id = r.user_id
  where (case when caller_founder then r.user_id = caller_id else r.company_id = caller_company and not actor.is_founder end)
    and r.status = 'reserved';

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
  founder_account boolean;
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

  select p.is_founder,
         case when p.is_founder then 5000000::bigint else c.ai_monthly_token_quota end
  into founder_account, quota
  from public.profiles p
  join public.companies c on c.id = p.company_id
  where p.id = reservation.user_id;

  select coalesce(sum(total_tokens), 0)::bigint into used_before
  from public.ai_usage_events e
  join public.profiles actor on actor.id = e.user_id
  where (case when founder_account then e.user_id = reservation.user_id else e.company_id = reservation.company_id and not actor.is_founder end)
    and e.created_at >= date_trunc('month', now());

  bonus_debit := case when founder_account then 0 else
    greatest(used_before + actual_total - quota, 0)
      - greatest(used_before - quota, 0)
  end;

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
  is_founder boolean,
  role text,
  monthly_quota bigint,
  monthly_used bigint,
  account_monthly_used bigint,
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
    p.is_founder,
    p.role,
    c.ai_monthly_token_quota,
    coalesce((
      select sum(e.total_tokens)::bigint
      from public.ai_usage_events e
      join public.profiles actor on actor.id = e.user_id
      where not actor.is_founder
        and e.company_id = c.id
        and e.created_at >= date_trunc('month', now())
    ), 0),
    coalesce((
      select sum(e.total_tokens)::bigint
      from public.ai_usage_events e
      where (
          (p.is_founder and e.user_id = p.id)
          or (
            not p.is_founder
            and e.company_id = c.id
            and not exists (
              select 1 from public.profiles actor
              where actor.id = e.user_id and actor.is_founder
            )
          )
        )
        and e.created_at >= date_trunc('month', now())
    ), 0),
    c.ai_bonus_token_balance
  from public.profiles p
  join public.companies c on c.id = p.company_id
  left join auth.users u on u.id = p.id
  where public.is_super_admin_user()
  order by c.name, p.is_founder desc, p.is_super_admin desc, p.created_at;
$$;

create or replace function public.admin_set_founder_account(p_user_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin_user() then
    raise exception 'Acces reserve aux super admins.';
  end if;

  if p_enabled and exists (
    select 1 from public.profiles where id = p_user_id and is_super_admin
  ) then
    raise exception 'Le compte super-admin technique ne peut pas etre le compte fondateur operationnel.';
  end if;

  update public.profiles
  set is_founder = p_enabled,
      ai_access_enabled = case when p_enabled then true else ai_access_enabled end
  where id = p_user_id;

  if not found then
    raise exception 'Compte utilisateur introuvable.';
  end if;
end;
$$;

grant execute on function public.admin_list_ai_accounts() to authenticated;
grant execute on function public.admin_set_founder_account(uuid, boolean) to authenticated;
revoke all on function public.admin_list_ai_accounts() from public, anon;
revoke all on function public.admin_set_founder_account(uuid, boolean) from public, anon;
