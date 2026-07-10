-- 021 - Journal d'acces et mode maintenance
--
-- Objectifs :
-- 1. tracer les connexions et pages vues authentifiees pour la console interne ;
-- 2. permettre aux super admins de voir rapidement quel compte utilise l'app,
--    depuis quelle IP et quel navigateur.
--
-- Note RGPD : ces donnees sont des donnees personnelles. Les conserver peu de
-- temps, les reserver aux super admins et informer les utilisateurs en beta.

create table if not exists public.access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  company_id uuid references public.companies(id) on delete set null,
  company_name text,
  actor_name text not null default 'Utilisateur',
  event_type text not null
    check (event_type in ('login', 'signup', 'page_view')),
  path text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists access_events_created_idx
  on public.access_events(created_at desc);
create index if not exists access_events_user_created_idx
  on public.access_events(user_id, created_at desc);
create index if not exists access_events_company_created_idx
  on public.access_events(company_id, created_at desc);

alter table public.access_events enable row level security;

-- Pas de lecture directe depuis le client. La console passe par la RPC ci-dessous.
create or replace function public.admin_list_access_events(limit_count integer default 80)
returns table (
  id uuid,
  user_id uuid,
  email text,
  company_id uuid,
  company_name text,
  actor_name text,
  event_type text,
  path text,
  ip_address text,
  user_agent text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ae.id,
    ae.user_id,
    ae.email,
    ae.company_id,
    ae.company_name,
    ae.actor_name,
    ae.event_type,
    ae.path,
    ae.ip_address,
    ae.user_agent,
    ae.created_at
  from public.access_events ae
  where public.is_super_admin_user()
  order by ae.created_at desc
  limit greatest(1, least(coalesce(limit_count, 80), 200));
$$;

grant execute on function public.admin_list_access_events(integer) to authenticated;
