alter table public.contacts
  add column if not exists phone text;

drop function if exists public.admin_list_companies();

create or replace function public.admin_list_companies()
returns table (
  id uuid,
  name text,
  billing_status text,
  plan_code text,
  comped_until date,
  billing_notes text,
  created_at timestamptz,
  owner_name text,
  owner_email text,
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
    owner_profile.full_name,
    owner_user.email::text,
    (select count(*) from public.profiles p where p.company_id = c.id),
    (select count(*) from public.shows s where s.company_id = c.id),
    (select count(*) from public.contacts ct where ct.company_id = c.id),
    (select count(*) from public.opportunities o where o.company_id = c.id),
    (select max(al.created_at) from public.activity_logs al where al.company_id = c.id)
  from public.companies c
  left join lateral (
    select p.id, p.full_name
    from public.profiles p
    where p.company_id = c.id
    order by
      case p.role when 'owner' then 0 when 'admin' then 1 else 2 end,
      p.created_at asc
    limit 1
  ) owner_profile on true
  left join auth.users owner_user on owner_user.id = owner_profile.id
  where public.is_super_admin_user()
  order by c.created_at desc;
$$;

grant execute on function public.admin_list_companies() to authenticated;
