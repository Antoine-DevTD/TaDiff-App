-- 013 - Console super admin (Phase A)
--
-- Objectifs :
-- 1. Flag is_super_admin sur profiles, modifiable UNIQUEMENT en SQL
--    (les privileges colonne de la 009 empechent deja toute modification client).
-- 2. Fonctions RPC security definer reservees aux super admins :
--    - admin_list_companies : supervision de toutes les compagnies ;
--    - admin_set_company_billing : changer statut/plan/comped/notes ;
--    - admin_list_beta_signups : inscrits beta + liste d'attente.
--
-- Pour donner l'acces a Titouan/Tony (SQL editor uniquement) :
--   update public.profiles set is_super_admin = true where id = '<user_id>';
--   (trouver l'id : select id, full_name from public.profiles;)

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

create or replace function public.is_super_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Supervision : toutes les compagnies avec volumes et derniere activite.
-- Retourne un ensemble vide si l'appelant n'est pas super admin.
create or replace function public.admin_list_companies()
returns table (
  id uuid,
  name text,
  billing_status text,
  plan_code text,
  comped_until date,
  billing_notes text,
  created_at timestamptz,
  member_count bigint,
  show_count bigint,
  contact_count bigint,
  deal_count bigint,
  last_activity timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.billing_status,
    c.plan_code,
    c.comped_until,
    c.billing_notes,
    c.created_at,
    (select count(*) from public.profiles p where p.company_id = c.id),
    (select count(*) from public.shows s where s.company_id = c.id),
    (select count(*) from public.contacts ct where ct.company_id = c.id),
    (select count(*) from public.opportunities o where o.company_id = c.id),
    (select max(al.created_at) from public.activity_logs al where al.company_id = c.id)
  from public.companies c
  where public.is_super_admin_user()
  order by c.created_at desc;
$$;

-- Mutation billing d'une compagnie (statut, plan, comped, notes).
create or replace function public.admin_set_company_billing(
  target_company_id uuid,
  new_status text,
  new_plan_code text,
  new_comped_until date,
  new_notes text
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

  if new_status not in ('trial', 'active', 'comped', 'past_due', 'cancelled') then
    raise exception 'Statut billing invalide : %', new_status;
  end if;

  update public.companies
  set billing_status = new_status,
      plan_code = coalesce(nullif(new_plan_code, ''), plan_code),
      comped_until = new_comped_until,
      billing_notes = nullif(new_notes, '')
  where id = target_company_id;

  if not found then
    raise exception 'Compagnie introuvable.';
  end if;
end;
$$;

-- Inscriptions beta (reservees + liste d'attente).
create or replace function public.admin_list_beta_signups()
returns table (
  id uuid,
  company_name text,
  contact_name text,
  email text,
  phone text,
  city text,
  discipline text,
  main_need text,
  status text,
  "position" integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.company_name,
    b.contact_name,
    b.email,
    b.phone,
    b.city,
    b.discipline,
    b.main_need,
    b.status,
    b.position,
    b.created_at
  from public.beta_signups b
  where public.is_super_admin_user()
  order by b.status, b.position;
$$;

grant execute on function public.is_super_admin_user() to authenticated;
grant execute on function public.admin_list_companies() to authenticated;
grant execute on function public.admin_set_company_billing(uuid, text, text, date, text) to authenticated;
grant execute on function public.admin_list_beta_signups() to authenticated;
