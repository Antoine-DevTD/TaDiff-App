-- TaDiff : supervision bêta, migrations 086 → 087 → 088 → 089.
-- À exécuter dans le SQL Editor du projet TaDiff, avant la mise en service du code.
-- Une seule transaction : une erreur annule l'ensemble du lot.
-- Aucun compte créé, email envoyé, paiement confirmé ou réglage Auth modifié.
-- Les sept jours de validité des liens ne se règlent pas par cette migration.
-- Préconditions : migrations 021, 044, 063, 065 et leurs dépendances présentes.
begin;

-- Source : sql/086_access_codes.sql
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

-- Source : sql/087_pending_payment_signup.sql
-- 087 - Compte et fiche compagnie gratuits, cockpit après activation.
-- Scaffold CLI 20261004084442_pending_payment_signup.sql.
-- Prérequis : 009, 013, 015, 031, 057, 063 et 086.
-- Aucun accès existant n'est modifié par cette migration.

alter table public.companies drop constraint if exists companies_billing_status_check;
alter table public.companies add constraint companies_billing_status_check
  check (billing_status in ('pending_payment','trial','active','comped','past_due','cancelled'));
alter table public.companies alter column billing_status set default 'pending_payment';

-- Les policies métier historiques appellent ce helper, parfois sans le helper
-- de facturation. Un compte en préparation ne doit donc pas contourner le
-- cockpit fermé en appelant directement l'API REST des spectacles/contacts.
-- Les autres statuts gardent leur comportement antérieur (notamment l'export).
create or replace function public.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p
    join public.companies c on c.id=p.company_id
    where p.id=auth.uid() and p.company_id=target_company_id
      and c.billing_status<>'pending_payment'
  );
$$;
revoke all on function public.is_company_member(uuid) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated;

-- La fiche compagnie et sa facturation doivent rester lisibles avant paiement.
-- Lecture du seul profil personnel : pas de boucle RLS via companies.
drop policy if exists "members can read companies" on public.companies;
create policy "members can read companies" on public.companies for select to authenticated
  using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.company_id=companies.id));

-- Les grants de 009/015/074 limitent déjà UPDATE aux champs de la fiche.
-- Le client ne peut ni s'attribuer une compagnie ni changer son abonnement.
revoke insert on public.companies, public.profiles from anon, authenticated;
revoke update (billing_status,plan_code,comped_until,billing_notes) on public.companies from anon, authenticated;
revoke update (role,company_id,is_super_admin) on public.profiles from anon, authenticated;

create or replace function public.ensure_workspace(company_name text default 'Ma compagnie')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid:=auth.uid(); confirmed_at timestamptz;
  signup_metadata jsonb; caller_email text; display_name text;
  existing_company_id uuid; created_company_id uuid;
  initial_status text:='pending_payment';
begin
  if current_user_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  -- Verrou commun avec la rédemption des codes, empêchant deux compagnies
  -- lors de confirmations ou d'ouvertures simultanées du parcours.
  select email_confirmed_at,raw_user_meta_data,email into confirmed_at,signup_metadata,caller_email
    from auth.users where id=current_user_id for update;
  if not found then raise exception 'Not authenticated' using errcode='42501'; end if;
  select company_id into existing_company_id from public.profiles where id=current_user_id;
  if existing_company_id is not null then
    if public.company_has_access(existing_company_id) then
      perform public.seed_reference_grants(existing_company_id);
    end if;
    return existing_company_id;
  end if;
  if confirmed_at is null then raise exception 'email_confirmation_required' using errcode='42501'; end if;
  if public.get_my_pending_access_code_signup() then raise exception 'access_code_required' using errcode='42501'; end if;

  -- Ce champ sert uniquement à l'affichage, jamais à attribuer un droit.
  display_name:=case when jsonb_typeof(signup_metadata->'full_name')='string'
    and char_length(trim(signup_metadata->>'full_name')) between 2 and 160
    then trim(signup_metadata->>'full_name') else coalesce(caller_email,'Utilisateur') end;

  -- Seul le parcours bêta déjà payé et explicitement relié à cet Auth user
  -- conserve son ancien statut. Aucune métadonnée modifiable ne donne de droit.
  if exists (
    select 1 from public.beta_signups b where b.invited_user_id=current_user_id
      and b.payment_confirmed_at is not null and b.is_demo=false and b.status='reserved'
  ) then initial_status:='trial'; end if;

  insert into public.companies(name,billing_status)
    values(coalesce(nullif(trim(company_name),''),'Ma compagnie'),initial_status)
    returning id into created_company_id;
  insert into public.profiles(id,company_id,role,full_name)
    values(current_user_id,created_company_id,'owner',display_name)
    on conflict(id) do update set company_id=excluded.company_id,
      role=coalesce(profiles.role,excluded.role),full_name=coalesce(profiles.full_name,excluded.full_name);
  if public.company_has_access(created_company_id) then
    perform public.seed_reference_grants(created_company_id);
  end if;
  return created_company_id;
end;
$$;
revoke all on function public.ensure_workspace(text) from public, anon;
grant execute on function public.ensure_workspace(text) to authenticated;

-- Le signup applicatif vérifie cette capacité AVANT l'appel à Supabase Auth.
-- L'absence de migration doit fermer le parcours, pas appeler l'ancien helper.
create or replace function public.direct_signup_ready()
returns boolean language sql stable security invoker set search_path = public as $$ select true; $$;
revoke all on function public.direct_signup_ready() from public;
grant execute on function public.direct_signup_ready() to anon, authenticated;

create or replace function public.save_pending_company_setup(p_values jsonb)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  caller_id uuid:=auth.uid(); caller_company uuid; caller_role text; current_status text;
  field record; max_length integer;
begin
  if caller_id is null then raise exception 'Authentification requise.' using errcode='42501'; end if;
  if p_values is null or jsonb_typeof(p_values)<>'object' then
    raise exception 'Fiche compagnie invalide.' using errcode='22023';
  end if;
  for field in select key,value from jsonb_each(p_values) loop
    max_length:=case field.key when 'full_name' then 160 when 'name' then 160
      when 'city' then 120 when 'discipline' then 120 when 'email' then 254
      when 'phone' then 40 when 'website' then 2048 when 'siret' then 40
      when 'license_number' then 80 when 'description' then 1200 else null end;
    if max_length is null or jsonb_typeof(field.value) not in ('string','null')
      or char_length(coalesce(p_values->>field.key,''))>max_length then
      raise exception 'Champ de fiche compagnie invalide : %',field.key using errcode='22023';
    end if;
  end loop;
  if char_length(trim(coalesce(p_values->>'full_name',''))) not between 2 and 160
    or char_length(trim(coalesce(p_values->>'name',''))) not between 2 and 160 then
    raise exception 'Le prénom et le nom de la compagnie sont requis.' using errcode='22023';
  end if;
  select p.company_id,p.role into caller_company,caller_role
    from public.profiles p where p.id=caller_id for update;
  if caller_company is null or caller_role not in ('owner','admin') then
    raise exception 'Responsable de la compagnie requis.' using errcode='42501';
  end if;
  select c.billing_status into current_status from public.companies c where c.id=caller_company for update;
  if current_status is distinct from 'pending_payment' then
    raise exception 'Cette fiche ne relève plus de la préparation avant paiement.' using errcode='42501';
  end if;
  update public.profiles set full_name=trim(p_values->>'full_name') where id=caller_id;
  update public.companies set
    name=trim(p_values->>'name'),
    city=case when p_values?'city' then nullif(trim(p_values->>'city'),'') else city end,
    discipline=case when p_values?'discipline' then nullif(trim(p_values->>'discipline'),'') else discipline end,
    email=case when p_values?'email' then nullif(trim(p_values->>'email'),'') else email end,
    phone=case when p_values?'phone' then nullif(trim(p_values->>'phone'),'') else phone end,
    website=case when p_values?'website' then nullif(trim(p_values->>'website'),'') else website end,
    siret=case when p_values?'siret' then nullif(trim(p_values->>'siret'),'') else siret end,
    license_number=case when p_values?'license_number' then nullif(trim(p_values->>'license_number'),'') else license_number end,
    description=case when p_values?'description' then nullif(trim(p_values->>'description'),'') else description end
    where id=caller_company;
  return true;
end;
$$;
revoke all on function public.save_pending_company_setup(jsonb) from public, anon;
grant execute on function public.save_pending_company_setup(jsonb) to authenticated;

-- Le superadministrateur peut aussi replacer un espace en préparation.
-- La modification reste une action privilégiée, jamais une étape du signup.
create or replace function public.admin_set_company_billing(
  target_company_id uuid,new_status text,new_plan_code text,new_comped_until date,new_notes text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_super_admin_user() then
    raise exception 'Accès réservé aux superadministrateurs.' using errcode='42501';
  end if;
  if new_status not in ('pending_payment','trial','active','comped','past_due','cancelled') then
    raise exception 'Statut de facturation invalide : %',new_status using errcode='22023';
  end if;
  update public.companies set billing_status=new_status,
    plan_code=coalesce(nullif(new_plan_code,''),plan_code),
    comped_until=new_comped_until,billing_notes=nullif(new_notes,'')
    where id=target_company_id;
  if not found then raise exception 'Compagnie introuvable.'; end if;
end;
$$;
revoke all on function public.admin_set_company_billing(uuid,text,text,date,text) from public, anon;
grant execute on function public.admin_set_company_billing(uuid,text,text,date,text) to authenticated;

notify pgrst, 'reload schema';

-- Source : sql/088_stripe_checkout_and_events.sql
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

-- Source : sql/089_beta_complimentary_supervision.sql
-- 089 — Accès bêta offerts et supervision des comptes/équipes.
-- Scaffold CLI : 20261005155309_beta_complimentary_supervision.sql.
-- Prérequis : 021, 044, 063, 065, 086, 087 et 088.
-- Aucun email envoyé, aucune confirmation Auth ou preuve de paiement inventée.

alter table public.beta_signups
  add column if not exists access_granted_at timestamptz,
  add column if not exists access_granted_by uuid references public.profiles(id) on delete set null,
  add column if not exists access_grant_note text;
alter table public.beta_signups drop constraint if exists beta_signups_access_grant_note_length;
alter table public.beta_signups add constraint beta_signups_access_grant_note_length
  check (char_length(coalesce(access_grant_note,'')) <= 1000);
alter table public.beta_access_events drop constraint if exists beta_access_events_event_type_check;
alter table public.beta_access_events add constraint beta_access_events_event_type_check check(event_type in (
  'payment_email_sent','payment_email_failed','payment_confirmed',
  'invitation_sent','invitation_failed','account_created','complimentary_access_granted'
));
alter table public.beta_signups enable row level security;
alter table public.beta_access_events enable row level security;
revoke all on public.beta_signups,public.beta_access_events from public,anon,authenticated;
grant select,insert,update on public.beta_signups to service_role;
grant select,insert on public.beta_access_events to service_role;

-- La résolution d'identité reste privée : un lien Auth explicite prime.
-- L'email exact normalisé n'est utilisé qu'en l'absence de lien et s'il est unique.
-- Le nom déclaré d'une compagnie n'est jamais une clé de rattachement.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create or replace function private.beta_signup_auth_user_id(p_signup_id uuid)
returns uuid language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare b public.beta_signups%rowtype; matched_ids uuid[];
begin
  select * into b from public.beta_signups where id=p_signup_id;
  if not found then return null; end if;
  if b.invited_user_id is not null then
    return (select u.id from auth.users u where u.id=b.invited_user_id);
  end if;
  select array_agg(u.id) into matched_ids from auth.users u
    where lower(trim(u.email))=lower(trim(b.email)) and nullif(trim(b.email),'') is not null;
  if cardinality(matched_ids)=1 then return matched_ids[1]; end if;
  return null;
end; $$;
revoke all on function private.beta_signup_auth_user_id(uuid) from public,anon,authenticated;

create or replace function private.mark_beta_account_created(p_user_id uuid,p_company_id uuid)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare b public.beta_signups%rowtype; profile_created timestamptz;
begin
  select p.created_at into profile_created from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_user_id and p.company_id=p_company_id and u.email_confirmed_at is not null;
  if not found then return; end if;
  for b in select s.* from public.beta_signups s where not s.is_demo and s.status='reserved'
    and private.beta_signup_auth_user_id(s.id)=p_user_id and s.account_created_at is null for update loop
    update public.beta_signups set account_created_at=profile_created,
      invited_user_id=coalesce(invited_user_id,p_user_id) where id=b.id;
    insert into public.beta_access_events(beta_signup_id,event_type,detail)
      values(b.id,'account_created','Compte confirmé et rattaché à sa compagnie');
  end loop;
end; $$;
revoke all on function private.mark_beta_account_created(uuid,uuid) from public,anon,authenticated;

create or replace function private.track_beta_profile_created()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if new.company_id is not null then perform private.mark_beta_account_created(new.id,new.company_id); end if;
  return new;
end; $$;
revoke all on function private.track_beta_profile_created() from public,anon,authenticated;
drop trigger if exists track_beta_profile_created on public.profiles;
create trigger track_beta_profile_created after insert or update of company_id on public.profiles
  for each row execute function private.track_beta_profile_created();

create or replace function public.admin_grant_beta_complimentary_access(p_signup_id uuid,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare b public.beta_signups%rowtype; target_user_id uuid; p public.profiles%rowtype;
  c public.companies%rowtype; applied boolean:=false; already_granted boolean;
begin
  if auth.uid() is null or not public.is_super_admin_user() then
    raise exception 'Accès réservé aux superadministrateurs.' using errcode='42501';
  end if;
  if char_length(coalesce(p_note,''))>1000 then raise exception 'Note trop longue.' using errcode='22023'; end if;
  target_user_id:=private.beta_signup_auth_user_id(p_signup_id);
  -- Même ordre de verrouillage que ensure_workspace : Auth, inscription, profil, compagnie.
  if target_user_id is not null then perform 1 from auth.users where id=target_user_id for update; end if;
  select * into b from public.beta_signups where id=p_signup_id for update;
  if not found or b.is_demo or b.status<>'reserved' then return jsonb_build_object('ok',false,'status','ineligible'); end if;
  if b.payment_confirmed_at is not null then return jsonb_build_object('ok',false,'status','paid_signup'); end if;
  if private.beta_signup_auth_user_id(b.id) is distinct from target_user_id then
    return jsonb_build_object('ok',false,'status','identity_changed');
  end if;
  if target_user_id is null and (b.invited_user_id is not null or exists(
    select 1 from auth.users u where lower(trim(u.email))=lower(trim(b.email))
  )) then return jsonb_build_object('ok',false,'status','identity_ambiguous'); end if;
  if target_user_id is not null then
    select * into p from public.profiles where id=target_user_id for update;
    if p.company_id is not null then
      if p.role not in ('owner','admin') then return jsonb_build_object('ok',false,'status','company_manager_required'); end if;
      select * into c from public.companies where id=p.company_id for update;
      if not found then return jsonb_build_object('ok',false,'status','company_missing'); end if;
      if c.stripe_subscription_id is not null or c.billing_status='active' then
        return jsonb_build_object('ok',false,'status','existing_subscription');
      end if;
      if exists(select 1 from public.stripe_checkout_attempts a where a.company_id=c.id and a.status in ('creating','open')) then
        return jsonb_build_object('ok',false,'status','existing_checkout');
      end if;
      if b.access_granted_at is null then
        update public.companies set billing_status='comped',comped_until=null where id=c.id;
      end if;
      applied:=true;
    end if;
  end if;
  already_granted:=b.access_granted_at is not null;
  update public.beta_signups set access_granted_at=coalesce(access_granted_at,now()),
    access_granted_by=coalesce(access_granted_by,auth.uid()),
    access_grant_note=case when already_granted then access_grant_note else nullif(trim(p_note),'') end,
    invited_user_id=coalesce(invited_user_id,target_user_id),last_access_error=null where id=b.id;
  if not already_granted then
    insert into public.beta_access_events(beta_signup_id,actor_id,event_type,detail)
      values(b.id,auth.uid(),'complimentary_access_granted',nullif(trim(p_note),''));
  end if;
  if applied then perform private.mark_beta_account_created(target_user_id,p.company_id); end if;
  return jsonb_build_object('ok',true,'status',case when already_granted then 'already_granted' when applied then 'activated' else 'prepared' end,
    'companyId',p.company_id,'alreadyGranted',already_granted);
end; $$;
revoke all on function public.admin_grant_beta_complimentary_access(uuid,text) from public,anon;
grant execute on function public.admin_grant_beta_complimentary_access(uuid,text) to authenticated;

-- Une offre explicite prime sur l'ancienne préparation par code, uniquement
-- après confirmation Auth. La réservation demeure privée et peut être reprise.
create or replace function public.get_my_pending_access_code_signup()
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from public.pending_access_code_signups pending join auth.users u on u.id=auth.uid()
    where pending.user_id=u.id or (pending.user_id is null and pending.email=lower(u.email))
  ) and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.company_id is not null)
  and not exists(select 1 from public.beta_signups b join auth.users u on u.id=auth.uid()
    where u.email_confirmed_at is not null and not b.is_demo and b.status='reserved'
      and b.access_granted_at is not null and private.beta_signup_auth_user_id(b.id)=u.id);
$$;
revoke all on function public.get_my_pending_access_code_signup() from public,anon;
grant execute on function public.get_my_pending_access_code_signup() to authenticated;

create or replace function public.ensure_workspace(company_name text default 'Ma compagnie')
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare current_user_id uuid:=auth.uid(); confirmed_at timestamptz; signup_metadata jsonb;
  caller_email text; display_name text; p public.profiles%rowtype; b public.beta_signups%rowtype;
  created_company_id uuid; initial_status text:='pending_payment';
begin
  if current_user_id is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select email_confirmed_at,raw_user_meta_data,email into confirmed_at,signup_metadata,caller_email
    from auth.users where id=current_user_id for update;
  if not found then raise exception 'Not authenticated' using errcode='42501'; end if;
  if confirmed_at is not null then
    select s.* into b from public.beta_signups s where not s.is_demo and s.status='reserved'
      and s.access_granted_at is not null and private.beta_signup_auth_user_id(s.id)=current_user_id
      order by (s.invited_user_id=current_user_id) desc,s.created_at,s.id limit 1 for update;
  end if;
  select * into p from public.profiles where id=current_user_id for update;
  if p.company_id is not null then
    -- Une offre historique ne réactive jamais une compagnie ensuite suspendue.
    -- Pour les comptes existants, l'activation a lieu une seule fois dans la RPC admin.
    if public.company_has_access(p.company_id) then perform public.seed_reference_grants(p.company_id); end if;
    perform private.mark_beta_account_created(current_user_id,p.company_id);
    return p.company_id;
  end if;
  if confirmed_at is null then raise exception 'email_confirmation_required' using errcode='42501'; end if;
  if public.get_my_pending_access_code_signup() then raise exception 'access_code_required' using errcode='42501'; end if;
  display_name:=case when jsonb_typeof(signup_metadata->'full_name')='string'
    and char_length(trim(signup_metadata->>'full_name')) between 2 and 160
    then trim(signup_metadata->>'full_name') else coalesce(caller_email,'Utilisateur') end;
  if b.id is not null then initial_status:='comped';
  elsif exists(select 1 from public.beta_signups s where s.invited_user_id=current_user_id
    and s.payment_confirmed_at is not null and not s.is_demo and s.status='reserved') then initial_status:='trial'; end if;
  insert into public.companies(name,billing_status,comped_until)
    values(coalesce(nullif(trim(company_name),''),'Ma compagnie'),initial_status,null) returning id into created_company_id;
  insert into public.profiles(id,company_id,role,full_name) values(current_user_id,created_company_id,'owner',display_name)
    on conflict(id) do update set company_id=excluded.company_id,
      role=coalesce(profiles.role,excluded.role),full_name=coalesce(profiles.full_name,excluded.full_name);
  if public.company_has_access(created_company_id) then perform public.seed_reference_grants(created_company_id); end if;
  return created_company_id;
end; $$;
revoke all on function public.ensure_workspace(text) from public,anon;
grant execute on function public.ensure_workspace(text) to authenticated;

-- Relire les droits après ensure_workspace : une nouvelle compagnie peut déjà
-- recevoir l'offre bêta illimitée. Un code fini ne doit jamais la raccourcir.
create or replace function public.redeem_access_code(p_code_hash text,p_company_name text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare caller_id uuid:=auth.uid(); caller_email text; confirmed_at timestamptz;
  code_row public.access_codes%rowtype; profile_row public.profiles%rowtype; company_row public.companies%rowtype;
  previous public.access_code_redemptions%rowtype; pending_row public.pending_access_code_signups%rowtype;
  company_id_value uuid; until_date date; created_company boolean:=false;
begin
  if caller_id is null then return jsonb_build_object('ok',false,'status','authentication_required'); end if;
  if not public.consume_access_code_attempt('redeem:'||caller_id::text,10) then return jsonb_build_object('ok',false,'status','rate_limited'); end if;
  select lower(email),email_confirmed_at into caller_email,confirmed_at from auth.users where id=caller_id for update;
  if not found or confirmed_at is null or caller_email is null then return jsonb_build_object('ok',false,'status','email_confirmation_required'); end if;
  select * into pending_row from public.pending_access_code_signups where user_id=caller_id or (user_id is null and email=caller_email);
  if found and pending_row.state<>'confirmation_sent' then return jsonb_build_object('ok',false,'status','registration_blocked'); end if;
  select * into profile_row from public.profiles where id=caller_id;
  if found and profile_row.role not in ('owner','admin') then return jsonb_build_object('ok',false,'status','company_manager_required'); end if;
  company_id_value:=profile_row.company_id;
  select * into code_row from public.access_codes where code_hash=p_code_hash for update;
  if not found then return jsonb_build_object('ok',false,'status','invalid_code'); end if;
  select * into previous from public.access_code_redemptions where code_id=code_row.id and (user_id=caller_id or company_id=company_id_value) limit 1;
  if found then
    if previous.company_id is distinct from company_id_value then return jsonb_build_object('ok',false,'status','already_used'); end if;
    return jsonb_build_object('ok',true,'status','already_applied','companyId',previous.company_id,'accessUntil',previous.access_until,'alreadyApplied',true,'newCompany',false);
  end if;
  if code_row.revoked_at is not null or code_row.expires_at<=now() or code_row.used_count>=code_row.max_uses then return jsonb_build_object('ok',false,'status','invalid_code'); end if;
  if code_row.target_email is not null and code_row.target_email<>caller_email then return jsonb_build_object('ok',false,'status','email_mismatch'); end if;
  until_date:=case when code_row.duration_days is null then null else (now() at time zone 'UTC')::date+code_row.duration_days-1 end;
  if company_id_value is null then
    if char_length(trim(coalesce(p_company_name,''))) not between 2 and 160 then return jsonb_build_object('ok',false,'status','company_name_required'); end if;
    delete from public.pending_access_code_signups where user_id=caller_id or (user_id is null and email=caller_email);
    company_id_value:=public.ensure_workspace(trim(p_company_name));
    created_company:=true;
  end if;
  select * into company_row from public.companies where id=company_id_value for update;
  if not found then return jsonb_build_object('ok',false,'status','company_manager_required'); end if;
  if company_row.billing_status='active' or company_row.stripe_subscription_id is not null then return jsonb_build_object('ok',false,'status','paid_account'); end if;
  if company_row.billing_status='comped' and (company_row.comped_until is null or (until_date is not null and company_row.comped_until>=until_date)) then
    return jsonb_build_object('ok',true,'status','unchanged','companyId',company_id_value,'accessUntil',company_row.comped_until,'unchanged',true,'newCompany',created_company);
  end if;
  update public.companies set billing_status='comped',comped_until=until_date where id=company_id_value;
  insert into public.access_code_redemptions(code_id,user_id,company_id,access_until) values(code_row.id,caller_id,company_id_value,until_date);
  update public.access_codes set used_count=used_count+1 where id=code_row.id;
  delete from public.pending_access_code_signups where user_id=caller_id or (user_id is null and email=caller_email);
  return jsonb_build_object('ok',true,'status','applied','companyId',company_id_value,'accessUntil',until_date,'newCompany',created_company);
end; $$;
revoke all on function public.redeem_access_code(text,text) from public,anon;
grant execute on function public.redeem_access_code(text,text) to authenticated;

drop function if exists public.admin_list_beta_signups();
create function public.admin_list_beta_signups()
returns table (
  id uuid,company_name text,contact_name text,email text,phone text,city text,discipline text,main_need text,
  status text,"position" integer,is_demo boolean,created_at timestamptz,payment_email_sent_at timestamptz,
  payment_confirmed_at timestamptz,payment_reference text,invitation_sent_at timestamptz,invited_user_id uuid,
  account_created_at timestamptz,last_access_error text,william_beta_credited_at timestamptz,
  access_granted_at timestamptz,access_grant_note text,linked_company_id uuid,linked_company_name text,
  billing_status text,comped_until date,member_count bigint,has_access boolean,account_exists boolean,
  email_confirmed_at timestamptz,last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare can_view_access boolean;
begin
  if auth.uid() is null or not public.has_platform_permission('view_beta') then
    raise exception 'Accès réservé à la supervision bêta.' using errcode='42501';
  end if;
  can_view_access:=public.has_platform_permission('view_access');
  return query select b.id,b.company_name,b.contact_name,b.email,b.phone,b.city,b.discipline,b.main_need,
    b.status,b.position,b.is_demo,b.created_at,b.payment_email_sent_at,b.payment_confirmed_at,b.payment_reference,
    b.invitation_sent_at,b.invited_user_id,b.account_created_at,b.last_access_error,b.william_beta_credited_at,
    b.access_granted_at,b.access_grant_note,c.id,c.name,c.billing_status,c.comped_until,
    (select count(*) from public.profiles team where team.company_id=c.id),
    coalesce(public.company_has_access(c.id),false),u.id is not null,u.email_confirmed_at,
    case when can_view_access then u.last_sign_in_at end
    from public.beta_signups b left join auth.users u on u.id=private.beta_signup_auth_user_id(b.id)
    left join public.profiles p on p.id=u.id left join public.companies c on c.id=p.company_id
    order by b.is_demo,b.status,b.position,b.id;
end; $$;
revoke all on function public.admin_list_beta_signups() from public,anon;
grant execute on function public.admin_list_beta_signups() to authenticated;

create or replace function public.admin_beta_supervision_ready()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select auth.uid() is not null and public.has_platform_permission('view_beta');
$$;
revoke all on function public.admin_beta_supervision_ready() from public,anon;
grant execute on function public.admin_beta_supervision_ready() to authenticated;

create or replace function public.admin_list_company_members()
returns table(company_id uuid,user_id uuid,full_name text,email text,role text,created_at timestamptz,
  last_activity timestamptz,last_login timestamptz)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare can_view_access boolean;
begin
  if auth.uid() is null or not public.has_platform_permission('view_companies') then
    raise exception 'Accès réservé à la supervision des compagnies.' using errcode='42501';
  end if;
  can_view_access:=public.has_platform_permission('view_access');
  return query select p.company_id,p.id,p.full_name,u.email::text,p.role,p.created_at,
    case when can_view_access then (select max(a.created_at) from public.access_events a
      where a.user_id=p.id and a.company_id=p.company_id) end,
    case when can_view_access then (select max(a.created_at) from public.access_events a
      where a.user_id=p.id and a.company_id=p.company_id and a.event_type='login') end
    from public.profiles p left join auth.users u on u.id=p.id where p.company_id is not null
    order by p.company_id,p.id;
end; $$;
revoke all on function public.admin_list_company_members() from public,anon;
grant execute on function public.admin_list_company_members() to authenticated;

-- Sérialiser aussi le Checkout après une attribution offerte : le contrôle
-- applicatif seul ne protège pas la fenêtre entre lecture et création Stripe.
create or replace function public.prepare_stripe_checkout(p_company_id uuid,p_actor_id uuid,p_plan_code text,p_price_id text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare c public.companies%rowtype; a public.stripe_checkout_attempts%rowtype;
begin
  select * into c from public.companies where id=p_company_id for update;
  if not found or not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_actor_id and p.company_id=p_company_id and p.role in ('owner','admin') and u.email_confirmed_at is not null)
    then return jsonb_build_object('ok',false,'status','forbidden'); end if;
  if c.billing_status='comped' and (c.comped_until is null or c.comped_until>=current_date) then
    return jsonb_build_object('ok',false,'status','complimentary_access'); end if;
  if p_plan_code not in ('beta','solo','pro','studio') or nullif(p_price_id,'') is null
    or (c.billing_status='pending_payment' and p_plan_code<>'beta')
    then return jsonb_build_object('ok',false,'status','invalid_price'); end if;
  select * into a from public.stripe_checkout_attempts where company_id=c.id and status in ('creating','open');
  if c.billing_status='active' or (c.stripe_subscription_id is not null and a.id is null)
    then return jsonb_build_object('ok',false,'status','existing_subscription'); end if;
  if found and (a.price_id<>p_price_id or a.plan_code<>p_plan_code) then
    return jsonb_build_object('ok',false,'status','existing_checkout'); end if;
  if a.id is null then
    insert into public.stripe_checkout_attempts(company_id,actor_id,plan_code,price_id,customer_id)
      values(c.id,p_actor_id,p_plan_code,p_price_id,c.stripe_customer_id) returning * into a;
  end if;
  return jsonb_build_object('ok',true,'attemptId',a.id,'customerId',coalesce(a.customer_id,c.stripe_customer_id),
    'sessionId',a.session_id,'sessionUrl',a.session_url,'createdAt',a.created_at);
end; $$;
revoke all on function public.prepare_stripe_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_stripe_checkout(uuid,uuid,text,text) to service_role;

notify pgrst,'reload schema';

commit;

-- Contrôle de présence après la transaction, sans déclencher de mutation.
select
  to_regclass('public.access_codes') is not null as access_codes_present,
  exists (select 1 from pg_constraint where conrelid = 'public.companies'::regclass
    and conname = 'companies_billing_status_check'
    and pg_get_constraintdef(oid) like '%pending_payment%') as pending_payment_present,
  to_regclass('public.stripe_checkout_attempts') is not null as stripe_attempts_present,
  to_regprocedure('public.admin_beta_supervision_ready()') is not null as beta_supervision_present;
