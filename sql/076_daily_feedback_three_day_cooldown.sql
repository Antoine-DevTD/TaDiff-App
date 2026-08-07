-- 076 - Espacer chaque sollicitation de retour d'au moins trois jours.
--
-- Une sollicitation est enregistrée dès que l'API attribue le formulaire à
-- l'utilisateur. Le délai s'applique donc aussi après « Plus tard » et sur un
-- autre appareil, sans dépendre du stockage local du navigateur.

create table if not exists public.feedback_prompt_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid not null,
  usage_date date not null,
  prompted_on date not null default ((now() at time zone 'Europe/Paris')::date),
  created_at timestamptz not null default now()
);

create unique index if not exists feedback_prompt_events_actor_day_idx
  on public.feedback_prompt_events(actor_id, prompted_on);

create index if not exists feedback_prompt_events_company_created_idx
  on public.feedback_prompt_events(company_id, created_at desc);

alter table public.feedback_prompt_events enable row level security;

-- Cette table est interne : elle n'est accessible que par la RPC ci-dessous.
revoke all on table public.feedback_prompt_events from public, anon, authenticated;

-- Conserver le délai pour les réponses déjà reçues avant cette migration.
insert into public.feedback_prompt_events (
  company_id,
  actor_id,
  usage_date,
  prompted_on,
  created_at
)
select
  f.company_id,
  f.actor_id,
  f.usage_date,
  (f.created_at at time zone 'Europe/Paris')::date,
  f.created_at
from public.feedback f
where f.source = 'daily_prompt'
  and f.actor_id is not null
  and f.usage_date is not null
on conflict (actor_id, prompted_on) do nothing;

create or replace function public.get_daily_feedback_prompt()
returns table (
  usage_date date,
  last_used_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile record;
  paris_today date := (now() at time zone 'Europe/Paris')::date;
  selected_usage_date date;
  selected_last_used_at timestamptz;
  inserted_event_id uuid;
begin
  select p.id, p.company_id
    into current_profile
  from public.profiles p
  where p.id = auth.uid();

  if current_profile.company_id is null then
    return;
  end if;

  -- Sérialiser les appels du même utilisateur, y compris autour de minuit.
  perform pg_advisory_xact_lock(hashtextextended(current_profile.id::text, 0));

  -- Une sollicitation le 8 permet la suivante le 11, jamais le 9 ou le 10.
  if exists (
    select 1
    from public.feedback_prompt_events fpe
    where fpe.actor_id = auth.uid()
      and fpe.prompted_on > paris_today - 3
  ) then
    return;
  end if;

  select
    (ae.created_at at time zone 'Europe/Paris')::date,
    max(ae.created_at)
    into selected_usage_date, selected_last_used_at
  from public.access_events ae
  where ae.user_id = auth.uid()
    and ae.company_id = current_profile.company_id
    and ae.event_type = 'page_view'
    and (ae.created_at at time zone 'Europe/Paris')::date < paris_today
    and (ae.created_at at time zone 'Europe/Paris')::date >= paris_today - 14
    and not exists (
      select 1
      from public.feedback f
      where f.actor_id = auth.uid()
        and f.source = 'daily_prompt'
        and f.usage_date = (ae.created_at at time zone 'Europe/Paris')::date
    )
  group by (ae.created_at at time zone 'Europe/Paris')::date
  order by (ae.created_at at time zone 'Europe/Paris')::date desc
  limit 1;

  if selected_usage_date is null then
    return;
  end if;

  insert into public.feedback_prompt_events (
    company_id,
    actor_id,
    usage_date,
    prompted_on
  )
  values (
    current_profile.company_id,
    current_profile.id,
    selected_usage_date,
    paris_today
  )
  on conflict (actor_id, prompted_on) do nothing
  returning id into inserted_event_id;

  -- Deux appareils ouverts simultanément ne reçoivent pas deux formulaires.
  if inserted_event_id is null then
    return;
  end if;

  return query select selected_usage_date, selected_last_used_at;
end;
$$;

revoke all on function public.get_daily_feedback_prompt() from public, anon;
grant execute on function public.get_daily_feedback_prompt() to authenticated;

notify pgrst, 'reload schema';
