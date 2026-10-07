-- 086 - Accès offert ou essai limité par code opaque, sans paiement.
-- Scaffold CLI 20260927132647_access_codes.sql ; prérequis 009, 013, 020, 057.
-- Les secrets bruts ne sont jamais stockés : uniquement SHA-256 et extrait masqué.

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  masked_code text not null check (char_length(masked_code) between 5 and 20),
  label text not null check (char_length(trim(label)) between 2 and 160),
  kind text not null check (kind in ('trial','free')),
  duration_days integer check (duration_days between 1 and 3650),
  target_email text check (target_email = lower(trim(target_email)) and char_length(target_email) <= 254),
  expires_at timestamptz,
  max_uses integer not null default 1 check (max_uses between 1 and 500),
  used_count integer not null default 0 check (used_count between 0 and max_uses),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (kind <> 'trial' or duration_days is not null)
);

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  access_until date,
  unique(code_id, user_id), unique(code_id, company_id)
);

create table if not exists public.access_code_attempts (
  rate_key text primary key check (char_length(rate_key) <= 160),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1
);
create index if not exists access_code_attempts_window_idx on public.access_code_attempts(window_started_at);

create table if not exists public.pending_access_code_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email)) and char_length(email) <= 254),
  user_id uuid unique references auth.users(id) on delete cascade,
  state text not null default 'reserved' check (state in ('reserved','confirmation_sent','blocked')),
  created_at timestamptz not null default now()
);

alter table public.access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;
alter table public.access_code_attempts enable row level security;
alter table public.pending_access_code_signups enable row level security;
revoke all on table public.access_codes, public.access_code_redemptions, public.access_code_attempts, public.pending_access_code_signups from anon, authenticated;
grant all on table public.access_codes, public.access_code_redemptions, public.access_code_attempts, public.pending_access_code_signups to service_role;
grant select(id,masked_code,label,kind,duration_days,target_email,expires_at,max_uses,used_count,created_at,revoked_at) on public.access_codes to authenticated;
drop policy if exists "superadmin reads access codes" on public.access_codes;
create policy "superadmin reads access codes" on public.access_codes for select to authenticated using ((select public.is_super_admin_user()));

-- Le provisioning doit passer par les fonctions contrôlées. Les anciens INSERT
-- directs permettaient de fournir billing_status, role ou is_super_admin.
revoke insert on public.profiles, public.companies from authenticated, anon;
drop policy if exists "users can insert own profile" on public.profiles;
drop policy if exists "authenticated users can create companies" on public.companies;

create or replace function public.consume_access_code_attempt(p_key text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_attempts integer;
begin
  delete from access_code_attempts where window_started_at < now() - interval '1 day';
  insert into access_code_attempts(rate_key) values(p_key)
  on conflict(rate_key) do update set
    attempts = case when access_code_attempts.window_started_at <= now()-interval '15 minutes' then 1 else least(access_code_attempts.attempts+1,100000) end,
    window_started_at = case when access_code_attempts.window_started_at <= now()-interval '15 minutes' then now() else access_code_attempts.window_started_at end
  returning attempts into current_attempts;
  return current_attempts <= p_limit;
end $$;
revoke all on function public.consume_access_code_attempt(text,integer) from public, anon, authenticated, service_role;

create or replace function public.admin_create_access_code(p_code_hash text,p_masked_code text,p_label text,p_kind text,p_duration_days integer,p_target_email text,p_expires_at timestamptz,p_max_uses integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare code_id uuid;
begin
  if auth.uid() is null or not public.is_super_admin_user() then raise exception 'Superadministrateur requis.' using errcode='42501'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'Expiration future requise.' using errcode='22023'; end if;
  insert into access_codes(code_hash,masked_code,label,kind,duration_days,target_email,expires_at,max_uses,created_by)
    values(p_code_hash,p_masked_code,trim(p_label),p_kind,p_duration_days,nullif(lower(trim(p_target_email)),''),p_expires_at,p_max_uses,auth.uid()) returning id into code_id;
  return code_id;
end $$;

create or replace function public.admin_revoke_access_code(p_code_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_super_admin_user() then raise exception 'Superadministrateur requis.' using errcode='42501'; end if;
  update access_codes set revoked_at=coalesce(revoked_at,now()) where id=p_code_id;
  return found;
end $$;

create or replace function public.get_my_pending_access_code_signup()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select auth.uid() is not null and exists (
    select 1 from pending_access_code_signups pending join auth.users u on u.id=auth.uid()
    where pending.user_id=u.id or (pending.user_id is null and pending.email=lower(u.email))
  ) and not exists(select 1 from profiles p where p.id=auth.uid() and p.company_id is not null);
$$;

-- Reprise du helper 057 : même initialisation, sérialisation de la création et
-- blocage des inscriptions par code avant la rédemption transactionnelle.
create or replace function public.ensure_workspace(company_name text default 'Ma compagnie')
returns uuid language plpgsql security definer set search_path = public as $$
declare current_user_id uuid:=auth.uid(); existing_company_id uuid; created_company_id uuid;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  perform id from auth.users where id=current_user_id for update;
  if not found then raise exception 'Not authenticated'; end if;
  select company_id into existing_company_id from profiles where id=current_user_id;
  if existing_company_id is not null then
    perform public.seed_reference_grants(existing_company_id);
    return existing_company_id;
  end if;
  if public.get_my_pending_access_code_signup() then raise exception 'access_code_required' using errcode='42501'; end if;
  insert into companies(name) values(coalesce(nullif(trim(company_name),''),'Ma compagnie')) returning id into created_company_id;
  insert into profiles(id,company_id,role,full_name) values(current_user_id,created_company_id,'owner',coalesce(auth.jwt()->>'email','Utilisateur'))
  on conflict(id) do update set company_id=excluded.company_id,role=coalesce(profiles.role,excluded.role),full_name=coalesce(profiles.full_name,excluded.full_name);
  perform public.seed_reference_grants(created_company_id);
  return created_company_id;
end $$;

create or replace function public.prepare_access_code_signup(p_code_hash text,p_email text,p_rate_key text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare normalized_email text:=lower(trim(p_email)); code_row access_codes%rowtype; reservation_id uuid;
begin
  if p_rate_key !~ '^[0-9a-f]{64}$' or normalized_email is null or char_length(normalized_email)>254 or normalized_email not like '%@%' then return jsonb_build_object('ok',false,'status','invalid_code'); end if;
  if not consume_access_code_attempt('signup-ip:'||p_rate_key,10) then return jsonb_build_object('ok',false,'status','rate_limited'); end if;
  if not consume_access_code_attempt('signup-email:'||md5(normalized_email),3) then return jsonb_build_object('ok',false,'status','rate_limited'); end if;
  select * into code_row from access_codes where code_hash=p_code_hash;
  if not found or code_row.revoked_at is not null or code_row.expires_at<=now() or code_row.used_count>=code_row.max_uses then return jsonb_build_object('ok',false,'status','invalid_code'); end if;
  if code_row.target_email is not null and code_row.target_email<>normalized_email then return jsonb_build_object('ok',false,'status','email_mismatch'); end if;
  -- Sérialise les réservations pour empêcher deux inscriptions du même email.
  perform pg_advisory_xact_lock(hashtextextended('access-signup:'||normalized_email,0));
  if exists(select 1 from auth.users where lower(email)=normalized_email) then return jsonb_build_object('ok',false,'status','existing_account'); end if;
  if exists(select 1 from pending_access_code_signups where email=normalized_email) then return jsonb_build_object('ok',false,'status','registration_in_progress'); end if;
  insert into pending_access_code_signups(email) values(normalized_email) returning id into reservation_id;
  return jsonb_build_object('ok',true,'status','ready','reservationId',reservation_id);
end $$;

create or replace function public.complete_access_code_signup(p_reservation_id uuid,p_user_id uuid,p_state text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare pending_row pending_access_code_signups%rowtype;
begin
  select * into pending_row from pending_access_code_signups where id=p_reservation_id for update;
  if not found then return false; end if;
  if p_state='cancel' and p_user_id is null then
    if not exists(select 1 from auth.users where lower(email)=pending_row.email and created_at>=pending_row.created_at) then
      delete from pending_access_code_signups where id=p_reservation_id;
    else
      update pending_access_code_signups set state='blocked' where id=p_reservation_id;
    end if;
    return true;
  end if;
  if p_state not in ('confirmation_sent','blocked') or p_user_id is null then return false; end if;
  if not exists(select 1 from auth.users where id=p_user_id and lower(email)=pending_row.email) then return false; end if;
  if pending_row.user_id is not null and pending_row.user_id<>p_user_id then return false; end if;
  update pending_access_code_signups set user_id=p_user_id,state=p_state where id=p_reservation_id;
  return true;
end $$;

create or replace function public.redeem_access_code(p_code_hash text,p_company_name text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  caller_id uuid:=auth.uid(); caller_email text; confirmed_at timestamptz;
  code_row access_codes%rowtype; profile_row profiles%rowtype; company_row companies%rowtype;
  previous access_code_redemptions%rowtype; pending_row pending_access_code_signups%rowtype;
  company_id_value uuid; until_date date; created_company boolean:=false;
begin
  if caller_id is null then return jsonb_build_object('ok',false,'status','authentication_required'); end if;
  if not consume_access_code_attempt('redeem:'||caller_id::text,10) then return jsonb_build_object('ok',false,'status','rate_limited'); end if;
  select lower(email),email_confirmed_at into caller_email,confirmed_at from auth.users where id=caller_id for update;
  if not found or confirmed_at is null or caller_email is null then return jsonb_build_object('ok',false,'status','email_confirmation_required'); end if;
  select * into pending_row from pending_access_code_signups where user_id=caller_id or (user_id is null and email=caller_email);
  if found and pending_row.state<>'confirmation_sent' then return jsonb_build_object('ok',false,'status','registration_blocked'); end if;
  select * into profile_row from profiles where id=caller_id;
  if found and profile_row.role not in ('owner','admin') then return jsonb_build_object('ok',false,'status','company_manager_required'); end if;
  company_id_value:=profile_row.company_id;
  select * into code_row from access_codes where code_hash=p_code_hash for update;
  if not found then return jsonb_build_object('ok',false,'status','invalid_code'); end if;
  select * into previous from access_code_redemptions where code_id=code_row.id and (user_id=caller_id or company_id=company_id_value) limit 1;
  if found then
    if previous.company_id is distinct from company_id_value then return jsonb_build_object('ok',false,'status','already_used'); end if;
    return jsonb_build_object('ok',true,'status','already_applied','companyId',previous.company_id,'accessUntil',previous.access_until,'alreadyApplied',true,'newCompany',false);
  end if;
  if code_row.revoked_at is not null or code_row.expires_at<=now() or code_row.used_count>=code_row.max_uses then return jsonb_build_object('ok',false,'status','invalid_code'); end if;
  if code_row.target_email is not null and code_row.target_email<>caller_email then return jsonb_build_object('ok',false,'status','email_mismatch'); end if;
  -- comped_until est inclusif, en jours civils UTC : 1 jour = aujourd'hui.
  until_date:=case when code_row.duration_days is null then null else (now() at time zone 'UTC')::date+code_row.duration_days-1 end;
  if company_id_value is not null then
    select * into company_row from companies where id=company_id_value for update;
    if not found then return jsonb_build_object('ok',false,'status','company_manager_required'); end if;
    if company_row.billing_status='active' or company_row.stripe_subscription_id is not null then return jsonb_build_object('ok',false,'status','paid_account'); end if;
    if company_row.billing_status='comped' and (company_row.comped_until is null or (until_date is not null and company_row.comped_until>=until_date)) then
      return jsonb_build_object('ok',true,'status','unchanged','companyId',company_id_value,'accessUntil',company_row.comped_until,'unchanged',true,'newCompany',false);
    end if;
  else
    if char_length(trim(coalesce(p_company_name,''))) not between 2 and 160 then return jsonb_build_object('ok',false,'status','company_name_required'); end if;
    -- Supprime la garde uniquement dans la transaction qui accorde le vrai accès.
    delete from pending_access_code_signups where user_id=caller_id or (user_id is null and email=caller_email);
    company_id_value:=public.ensure_workspace(trim(p_company_name));
    created_company:=true;
  end if;
  update companies set billing_status='comped',comped_until=until_date where id=company_id_value;
  insert into access_code_redemptions(code_id,user_id,company_id,access_until) values(code_row.id,caller_id,company_id_value,until_date);
  update access_codes set used_count=used_count+1 where id=code_row.id;
  delete from pending_access_code_signups where user_id=caller_id or (user_id is null and email=caller_email);
  return jsonb_build_object('ok',true,'status','applied','companyId',company_id_value,'accessUntil',until_date,'newCompany',created_company);
end $$;

revoke all on function public.admin_create_access_code(text,text,text,text,integer,text,timestamptz,integer) from public, anon;
revoke all on function public.admin_revoke_access_code(uuid) from public, anon;
revoke all on function public.redeem_access_code(text,text) from public, anon;
revoke all on function public.get_my_pending_access_code_signup() from public, anon;
revoke all on function public.ensure_workspace(text) from public, anon;
revoke all on function public.prepare_access_code_signup(text,text,text) from public, anon, authenticated;
revoke all on function public.complete_access_code_signup(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,text,integer,text,timestamptz,integer) to authenticated;
grant execute on function public.admin_revoke_access_code(uuid) to authenticated;
grant execute on function public.redeem_access_code(text,text) to authenticated;
grant execute on function public.get_my_pending_access_code_signup() to authenticated;
grant execute on function public.ensure_workspace(text) to authenticated;
grant execute on function public.prepare_access_code_signup(text,text,text) to service_role;
grant execute on function public.complete_access_code_signup(uuid,uuid,text) to service_role;
notify pgrst, 'reload schema';
