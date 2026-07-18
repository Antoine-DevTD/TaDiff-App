-- 030 - Mesure d'audience publique, limitee et sans adresse IP
--
-- Donnees collectees : session aleatoire limitee a l'onglet, page, CTA, source UTM,
-- appareil simplifie et date. Aucune IP, aucun email et aucun user-agent complet.

create table if not exists public.public_analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event_type text not null check (event_type in ('page_view', 'cta_click', 'beta_signup')),
  path text not null,
  event_name text,
  target text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  device_type text not null default 'desktop'
    check (device_type in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index if not exists public_analytics_created_idx
  on public.public_analytics_events(created_at desc);
create index if not exists public_analytics_session_idx
  on public.public_analytics_events(session_id, created_at desc);
create index if not exists public_analytics_event_idx
  on public.public_analytics_events(event_type, created_at desc);

alter table public.public_analytics_events enable row level security;

-- Aucune lecture ni ecriture directe depuis le navigateur. Les insertions passent
-- par l'API serveur et la lecture par cette RPC reservee aux super administrateurs.
create or replace function public.admin_list_public_analytics_events(
  since_days integer default 30,
  limit_count integer default 2000
)
returns table (
  id uuid,
  session_id uuid,
  event_type text,
  path text,
  event_name text,
  target text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  device_type text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pae.id,
    pae.session_id,
    pae.event_type,
    pae.path,
    pae.event_name,
    pae.target,
    pae.referrer_host,
    pae.utm_source,
    pae.utm_medium,
    pae.utm_campaign,
    pae.utm_content,
    pae.device_type,
    pae.created_at
  from public.public_analytics_events pae
  where public.is_super_admin_user()
    and pae.created_at >= now() - make_interval(days => greatest(1, least(coalesce(since_days, 30), 90)))
  order by pae.created_at desc
  limit greatest(1, least(coalesce(limit_count, 2000), 5000));
$$;

grant execute on function public.admin_list_public_analytics_events(integer, integer)
  to authenticated;

-- A ajouter a la purge quotidienne Supabase Cron :
-- delete from public.public_analytics_events where created_at < now() - interval '90 days';
