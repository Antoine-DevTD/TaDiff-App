create or replace function public.ensure_workspace(company_name text default 'Ma compagnie')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_company_id uuid;
  created_company_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select profiles.company_id
    into existing_company_id
  from public.profiles
  where profiles.id = current_user_id;

  if existing_company_id is not null then
    return existing_company_id;
  end if;

  insert into public.companies(name)
  values (coalesce(nullif(company_name, ''), 'Ma compagnie'))
  returning id into created_company_id;

  insert into public.profiles(id, company_id, role, full_name)
  values (
    current_user_id,
    created_company_id,
    'owner',
    coalesce(auth.jwt() ->> 'email', 'Utilisateur')
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        role = coalesce(public.profiles.role, excluded.role),
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return created_company_id;
end;
$$;

grant execute on function public.ensure_workspace(text) to authenticated;
