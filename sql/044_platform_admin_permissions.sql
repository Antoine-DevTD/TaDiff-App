-- 044 - Administrateurs de plateforme a permissions deleguees

create table if not exists public.platform_admin_access (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  permissions text[] not null default '{}',
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_admin_permissions_allowed check (
    permissions <@ array[
      'view_companies', 'view_beta', 'view_access', 'manage_feedback',
      'view_audience', 'manage_legal', 'manage_catalogs',
      'manage_email_templates', 'manage_ai'
    ]::text[]
  )
);

alter table public.platform_admin_access enable row level security;

create or replace function public.has_platform_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin_user() or exists (
    select 1
    from public.platform_admin_access access
    where access.user_id = (select auth.uid())
      and requested_permission = any(access.permissions)
  );
$$;

create or replace function public.is_platform_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin_user() or exists (
    select 1 from public.platform_admin_access where user_id = (select auth.uid())
  );
$$;

create or replace function public.get_my_platform_permissions()
returns table(is_super_admin boolean, permissions text[])
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin_user(),
    case
      when public.is_super_admin_user() then array[
        'view_companies', 'view_beta', 'view_access', 'manage_feedback',
        'view_audience', 'manage_legal', 'manage_catalogs',
        'manage_email_templates', 'manage_ai'
      ]::text[]
      else coalesce((select access.permissions from public.platform_admin_access access where access.user_id = (select auth.uid())), '{}')
    end;
$$;

create or replace function public.admin_list_platform_admins()
returns table(user_id uuid, email text, full_name text, permissions text[], updated_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select access.user_id, users.email::text, profiles.full_name, access.permissions, access.updated_at
  from public.platform_admin_access access
  join public.profiles profiles on profiles.id = access.user_id
  join auth.users users on users.id = access.user_id
  where public.is_super_admin_user()
  order by profiles.full_name;
$$;

create or replace function public.admin_set_platform_admin(target_user_id uuid, new_permissions text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_permissions constant text[] := array[
    'view_companies', 'view_beta', 'view_access', 'manage_feedback',
    'view_audience', 'manage_legal', 'manage_catalogs',
    'manage_email_templates', 'manage_ai'
  ];
begin
  if not public.is_super_admin_user() then
    raise exception 'Acces reserve aux super admins.';
  end if;
  if exists (select 1 from unnest(coalesce(new_permissions, '{}')) permission where not permission = any(allowed_permissions)) then
    raise exception 'Permission de plateforme invalide.';
  end if;
  if exists (select 1 from public.profiles where id = target_user_id and is_super_admin) then
    raise exception 'Les droits du super-admin ne sont pas geres ici.';
  end if;
  if coalesce(cardinality(new_permissions), 0) = 0 then
    delete from public.platform_admin_access where user_id = target_user_id;
  else
    insert into public.platform_admin_access(user_id, permissions, granted_by, updated_at)
    values (target_user_id, array(select distinct unnest(new_permissions)), (select auth.uid()), now())
    on conflict (user_id) do update set permissions = excluded.permissions, granted_by = excluded.granted_by, updated_at = now();
  end if;
end;
$$;

drop policy if exists "platform admins read own access" on public.platform_admin_access;
create policy "platform admins read own access" on public.platform_admin_access
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_super_admin_user()));

grant select on public.platform_admin_access to authenticated;
grant execute on function public.has_platform_permission(text) to authenticated;
grant execute on function public.is_platform_admin_user() to authenticated;
grant execute on function public.get_my_platform_permissions() to authenticated;
grant execute on function public.admin_list_platform_admins() to authenticated;
grant execute on function public.admin_set_platform_admin(uuid, text[]) to authenticated;
revoke all on function public.has_platform_permission(text) from public, anon;
revoke all on function public.is_platform_admin_user() from public, anon;
revoke all on function public.get_my_platform_permissions() from public, anon;
revoke all on function public.admin_list_platform_admins() from public, anon;
revoke all on function public.admin_set_platform_admin(uuid, text[]) from public, anon;

-- Les catalogues et modeles restent lisibles comme auparavant, mais leur gestion
-- peut desormais etre deleguee sans donner acces a la facturation.
drop policy if exists "platform admins manage platform settings" on public.platform_settings;
create policy "platform admins manage platform settings" on public.platform_settings
for all to authenticated using (public.has_platform_permission('manage_legal')) with check (public.has_platform_permission('manage_legal'));
drop policy if exists "platform admins manage grant catalog" on public.grant_catalog;
create policy "platform admins manage grant catalog" on public.grant_catalog
for all to authenticated using (public.has_platform_permission('manage_catalogs')) with check (public.has_platform_permission('manage_catalogs'));
drop policy if exists "platform admins manage patronage catalog" on public.patronage_catalog;
create policy "platform admins manage patronage catalog" on public.patronage_catalog
for all to authenticated using (public.has_platform_permission('manage_catalogs')) with check (public.has_platform_permission('manage_catalogs'));
drop policy if exists "platform admins manage email templates" on public.platform_email_templates;
create policy "platform admins manage email templates" on public.platform_email_templates
for all to authenticated using (public.has_platform_permission('manage_email_templates')) with check (public.has_platform_permission('manage_email_templates'));
drop policy if exists "platform admins manage ai settings" on public.ai_settings;
create policy "platform admins manage ai settings" on public.ai_settings
for all to authenticated using (public.has_platform_permission('manage_ai')) with check (public.has_platform_permission('manage_ai'));
drop policy if exists "platform admins manage global rag" on public.rag_documents;
create policy "platform admins manage global rag" on public.rag_documents
for all to authenticated using (company_id is null and public.has_platform_permission('manage_ai')) with check (company_id is null and public.has_platform_permission('manage_ai'));
drop policy if exists "platform admins read William analytics" on public.william_question_events;
create policy "platform admins read William analytics" on public.william_question_events
for select to authenticated using (public.has_platform_permission('manage_ai'));

-- Les RPC de supervision restent les seules portes de lecture globale. Chacune
-- verifie le droit precis au lieu d'accorder un acces general a la plateforme.
create or replace function public.admin_list_companies()
returns table (
  id uuid, name text, billing_status text, plan_code text, comped_until date,
  billing_notes text, created_at timestamptz, owner_name text, owner_email text,
  member_count bigint, show_count bigint, contact_count bigint, deal_count bigint,
  last_activity timestamptz
)
language sql stable security definer set search_path = public, auth
as $$
  select c.id, c.name, c.billing_status, c.plan_code, c.comped_until, c.billing_notes,
    c.created_at, owner_profile.full_name, owner_user.email::text,
    (select count(*) from public.profiles p where p.company_id = c.id),
    (select count(*) from public.shows s where s.company_id = c.id),
    (select count(*) from public.contacts ct where ct.company_id = c.id),
    (select count(*) from public.opportunities o where o.company_id = c.id),
    (select max(al.created_at) from public.activity_logs al where al.company_id = c.id)
  from public.companies c
  left join lateral (
    select p.id, p.full_name from public.profiles p where p.company_id = c.id
    order by case p.role when 'owner' then 0 when 'admin' then 1 else 2 end, p.created_at asc limit 1
  ) owner_profile on true
  left join auth.users owner_user on owner_user.id = owner_profile.id
  where public.has_platform_permission('view_companies')
  order by c.created_at desc;
$$;

create or replace function public.admin_list_beta_signups()
returns table (
  id uuid, company_name text, contact_name text, email text, phone text, city text,
  discipline text, main_need text, status text, "position" integer, is_demo boolean,
  created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select b.id, b.company_name, b.contact_name, b.email, b.phone, b.city,
    b.discipline, b.main_need, b.status, b.position, b.is_demo, b.created_at
  from public.beta_signups b
  where public.has_platform_permission('view_beta')
  order by b.is_demo, b.status, b.position;
$$;

create or replace function public.admin_list_feedback()
returns table (
  id uuid, company_id uuid, company_name text, actor_name text, page text,
  kind text, message text, status text, admin_response text, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select f.id, f.company_id, c.name, f.actor_name, f.page, f.kind, f.message,
    f.status, f.admin_response, f.created_at
  from public.feedback f join public.companies c on c.id = f.company_id
  where public.has_platform_permission('manage_feedback')
  order by case f.status when 'nouveau' then 0 when 'en_cours' then 1 else 2 end, f.created_at desc;
$$;

create or replace function public.admin_set_feedback_status(target_feedback_id uuid, new_status text, new_response text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_platform_permission('manage_feedback') then raise exception 'Permission retours requise.'; end if;
  if new_status not in ('nouveau', 'en_cours', 'traite') then raise exception 'Statut invalide : %', new_status; end if;
  update public.feedback set status = new_status, admin_response = nullif(new_response, ''), updated_at = now()
  where id = target_feedback_id;
  if not found then raise exception 'Retour introuvable.'; end if;
end;
$$;

create or replace function public.admin_list_access_events(limit_count integer default 80)
returns table (
  id uuid, user_id uuid, email text, company_id uuid, company_name text,
  actor_name text, event_type text, path text, ip_address text, user_agent text,
  created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select ae.id, ae.user_id, ae.email, ae.company_id, ae.company_name, ae.actor_name,
    ae.event_type, ae.path, ae.ip_address, ae.user_agent, ae.created_at
  from public.access_events ae where public.has_platform_permission('view_access')
  order by ae.created_at desc limit greatest(1, least(coalesce(limit_count, 80), 200));
$$;

create or replace function public.admin_list_public_analytics_events(since_days integer default 30, limit_count integer default 2000)
returns table (
  id uuid, session_id uuid, event_type text, path text, event_name text, target text,
  referrer_host text, utm_source text, utm_medium text, utm_campaign text,
  utm_content text, device_type text, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select pae.id, pae.session_id, pae.event_type, pae.path, pae.event_name, pae.target,
    pae.referrer_host, pae.utm_source, pae.utm_medium, pae.utm_campaign,
    pae.utm_content, pae.device_type, pae.created_at
  from public.public_analytics_events pae
  where public.has_platform_permission('view_audience')
    and pae.created_at >= now() - make_interval(days => greatest(1, least(coalesce(since_days, 30), 90)))
  order by pae.created_at desc limit greatest(1, least(coalesce(limit_count, 2000), 5000));
$$;
