-- 009 - Billing status compagnie + roles verrouilles
--
-- Objectifs :
-- 1. Ajouter le statut d'abonnement sur companies (trial, active, comped, past_due, cancelled).
-- 2. Normaliser les roles profiles (owner, admin, member, readonly).
-- 3. Empecher un utilisateur de modifier lui-meme son role ou sa compagnie.
-- 4. Fournir des helpers SQL pour les permissions et l'acces produit.

-- 1. Statut billing sur companies -------------------------------------------

alter table public.companies
  add column if not exists billing_status text not null default 'trial',
  add column if not exists plan_code text not null default 'beta',
  add column if not exists comped_until date,
  add column if not exists billing_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_billing_status_check'
  ) then
    alter table public.companies
      add constraint companies_billing_status_check
      check (billing_status in ('trial', 'active', 'comped', 'past_due', 'cancelled'));
  end if;
end $$;

create index if not exists companies_billing_status_idx on public.companies(billing_status);

-- 2. Roles profiles ----------------------------------------------------------

-- Normalise les valeurs existantes avant de poser la contrainte.
update public.profiles
set role = 'owner'
where role is null or role not in ('owner', 'admin', 'member', 'readonly');

alter table public.profiles
  alter column role set default 'member',
  alter column role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('owner', 'admin', 'member', 'readonly'));
  end if;
end $$;

-- 3. Verrouillage : un utilisateur ne peut pas s'auto-promouvoir --------------
--
-- Les privileges colonne empechent de modifier role/company_id depuis le client,
-- meme si la policy RLS "users can update own profile" autorise la ligne.
-- ensure_workspace reste security definer et n'est pas concerne.

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Sur companies : seul name est modifiable, et uniquement par owner/admin.
-- Les colonnes billing_* / plan_code / comped_until ne sont jamais modifiables
-- depuis le client : elles se gerent via SQL (voir sql/README_comped.md)
-- ou plus tard via le webhook Stripe en service role.

revoke update on public.companies from authenticated;
grant update (name) on public.companies to authenticated;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = target_company_id
      and profiles.role in ('owner', 'admin')
  );
$$;

drop policy if exists "admins can update company" on public.companies;
create policy "admins can update company"
  on public.companies for update
  using (public.is_company_admin(id))
  with check (public.is_company_admin(id));

-- 4. Helpers d'acces ----------------------------------------------------------

-- Role de l'utilisateur courant dans sa compagnie.
create or replace function public.current_company_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where profiles.id = auth.uid();
$$;

-- Une compagnie a-t-elle acces au produit ?
-- trial et active : oui. comped : oui tant que comped_until est null ou future.
-- past_due et cancelled : non.
create or replace function public.company_has_access(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies
    where companies.id = target_company_id
      and (
        companies.billing_status in ('trial', 'active')
        or (
          companies.billing_status = 'comped'
          and (companies.comped_until is null or companies.comped_until >= current_date)
        )
      )
  );
$$;

grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.current_company_role() to authenticated;
grant execute on function public.company_has_access(uuid) to authenticated;
