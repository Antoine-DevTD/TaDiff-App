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
