-- 016 - Equipe & acces : membres, roles, invitation par code
--
-- Objectifs :
-- 1. Donner a chaque compagnie un code d'invitation partageable.
-- 2. Lister les membres d'une compagnie (RPC security definer : la policy
--    profiles ne permet de lire que son propre profil).
-- 3. Permettre a owner/admin de changer le role d'un membre (jamais le dernier owner).
-- 4. Permettre a un utilisateur de rejoindre une compagnie via un code.

-- 1. Code d'invitation --------------------------------------------------------

alter table public.companies
  add column if not exists invite_code text;

update public.companies
set invite_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where invite_code is null;

create unique index if not exists companies_invite_code_idx on public.companies(invite_code);

-- 2. Lister les membres -------------------------------------------------------

create or replace function public.list_company_members()
returns table (
  id uuid,
  full_name text,
  role text,
  email text,
  is_self boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.role,
    u.email,
    (p.id = auth.uid()) as is_self
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.company_id = (select company_id from public.profiles where id = auth.uid())
    and (select company_id from public.profiles where id = auth.uid()) is not null
  order by
    case p.role
      when 'owner' then 0
      when 'admin' then 1
      when 'member' then 2
      else 3
    end,
    p.full_name nulls last;
$$;

-- 3. Changer le role d'un membre ---------------------------------------------

create or replace function public.set_member_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_company uuid;
  target_company uuid;
  target_current_role text;
  owner_count integer;
begin
  if new_role not in ('owner', 'admin', 'member', 'readonly') then
    raise exception 'Role invalide : %', new_role;
  end if;

  select company_id into caller_company from public.profiles where id = auth.uid();

  if not public.is_company_admin(caller_company) then
    raise exception 'Action reservee aux roles owner et admin.';
  end if;

  select company_id, role into target_company, target_current_role
  from public.profiles where id = target_user_id;

  if target_company is null or target_company <> caller_company then
    raise exception 'Ce membre n''appartient pas a votre compagnie.';
  end if;

  -- Ne jamais retirer le dernier owner.
  if target_current_role = 'owner' and new_role <> 'owner' then
    select count(*) into owner_count
    from public.profiles
    where company_id = caller_company and role = 'owner';

    if owner_count <= 1 then
      raise exception 'Impossible de retrograder le dernier owner de la compagnie.';
    end if;
  end if;

  update public.profiles set role = new_role where id = target_user_id;
end;
$$;

-- 4. Rejoindre une compagnie via un code -------------------------------------

create or replace function public.join_company_by_code(code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company uuid;
  target_name text;
begin
  select id, name into target_company, target_name
  from public.companies
  where invite_code = upper(trim(code));

  if target_company is null then
    raise exception 'Code d''invitation invalide.';
  end if;

  update public.profiles
  set company_id = target_company,
      role = case when role = 'owner' then 'member' else role end
  where id = auth.uid();

  return target_name;
end;
$$;

-- 5. Regenerer le code d'invitation (owner/admin) ----------------------------

create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_company uuid;
  new_code text;
begin
  select company_id into caller_company from public.profiles where id = auth.uid();

  if not public.is_company_admin(caller_company) then
    raise exception 'Action reservee aux roles owner et admin.';
  end if;

  new_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update public.companies set invite_code = new_code where id = caller_company;
  return new_code;
end;
$$;

grant execute on function public.list_company_members() to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.join_company_by_code(text) to authenticated;
grant execute on function public.regenerate_invite_code() to authenticated;
