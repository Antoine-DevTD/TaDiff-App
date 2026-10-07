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
