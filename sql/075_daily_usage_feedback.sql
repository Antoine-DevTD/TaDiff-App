-- 075 - Retour d'usage quotidien, non intrusif et rattaché à une journée réelle.

alter table public.feedback
  add column if not exists source text not null default 'manual',
  add column if not exists usage_date date,
  add column if not exists problem_areas text[] not null default '{}'::text[],
  add column if not exists no_problem boolean not null default false,
  add column if not exists suggestion text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feedback_source_check'
  ) then
    alter table public.feedback
      add constraint feedback_source_check
      check (source in ('manual', 'daily_prompt'));
  end if;
end;
$$;

create unique index if not exists feedback_daily_actor_usage_idx
  on public.feedback(actor_id, usage_date)
  where source = 'daily_prompt' and actor_id is not null and usage_date is not null;

create or replace function public.get_daily_feedback_prompt()
returns table (
  usage_date date,
  last_used_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with recent_usage as (
    select
      (ae.created_at at time zone 'Europe/Paris')::date as usage_date,
      max(ae.created_at) as last_used_at
    from public.access_events ae
    join public.profiles p
      on p.id = auth.uid()
      and p.company_id = ae.company_id
    where ae.user_id = auth.uid()
      and ae.event_type = 'page_view'
      and (ae.created_at at time zone 'Europe/Paris')::date
        < (now() at time zone 'Europe/Paris')::date
      and (ae.created_at at time zone 'Europe/Paris')::date
        >= (now() at time zone 'Europe/Paris')::date - 14
    group by (ae.created_at at time zone 'Europe/Paris')::date
  )
  select ru.usage_date, ru.last_used_at
  from recent_usage ru
  where auth.uid() is not null
    and not exists (
      select 1
      from public.feedback f
      where f.actor_id = auth.uid()
        and f.source = 'daily_prompt'
        and f.usage_date = ru.usage_date
    )
  order by ru.usage_date desc
  limit 1;
$$;

create or replace function public.submit_daily_feedback(
  p_usage_date date,
  p_problem_areas text[],
  p_no_problem boolean,
  p_note text default null,
  p_suggestion text default null,
  p_page text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile record;
  cleaned_areas text[];
  allowed_areas constant text[] := array[
    'agenda_actions',
    'shows',
    'contacts_venues',
    'diffusion_exploitation',
    'treasury',
    'documents_funding',
    'emails',
    'william',
    'navigation'
  ];
  area_labels constant jsonb := jsonb_build_object(
    'agenda_actions', 'Agenda et actions',
    'shows', 'Spectacles',
    'contacts_venues', 'Contacts et lieux',
    'diffusion_exploitation', 'Diffusion et exploitation',
    'treasury', 'Trésorerie',
    'documents_funding', 'Documents et subventions',
    'emails', 'Emails',
    'william', 'William',
    'navigation', 'Navigation'
  );
  synthesized_message text;
begin
  select p.id, p.company_id, coalesce(nullif(p.full_name, ''), 'Utilisateur') as full_name
    into current_profile
  from public.profiles p
  where p.id = auth.uid();

  if current_profile.company_id is null then
    raise exception 'Aucune compagnie associée.';
  end if;

  if p_usage_date is null
    or p_usage_date >= (now() at time zone 'Europe/Paris')::date
    or p_usage_date < (now() at time zone 'Europe/Paris')::date - 14 then
    raise exception 'Journée d''utilisation invalide.';
  end if;

  if p_no_problem is null then
    raise exception 'Le choix de problème est obligatoire.';
  end if;

  if not exists (
    select 1
    from public.access_events ae
    where ae.user_id = auth.uid()
      and ae.company_id = current_profile.company_id
      and ae.event_type = 'page_view'
      and (ae.created_at at time zone 'Europe/Paris')::date = p_usage_date
  ) then
    raise exception 'Aucune utilisation correspondante.';
  end if;

  select coalesce(array_agg(distinct area order by area), '{}'::text[])
    into cleaned_areas
  from unnest(coalesce(p_problem_areas, '{}'::text[])) as area
  where area = any(allowed_areas);

  if cardinality(cleaned_areas) <> cardinality(coalesce(p_problem_areas, '{}'::text[])) then
    raise exception 'Zone de problème invalide.';
  end if;

  if p_no_problem and cardinality(cleaned_areas) > 0 then
    raise exception 'Aucun problème ne peut pas être combiné avec une zone.';
  end if;

  if not p_no_problem and cardinality(cleaned_areas) = 0 then
    raise exception 'Sélectionnez une zone ou Aucun problème.';
  end if;

  if length(coalesce(p_note, '')) > 2000 or length(coalesce(p_suggestion, '')) > 2000 then
    raise exception 'Le texte est trop long.';
  end if;

  if p_no_problem then
    synthesized_message := 'Aucun problème signalé.';
    if nullif(trim(coalesce(p_suggestion, '')), '') is not null then
      synthesized_message := synthesized_message || E'\n\nSuggestion : ' || trim(p_suggestion);
    end if;
  else
    select 'Problèmes rencontrés : ' || string_agg(area_labels ->> area, ', ' order by area_labels ->> area) || '.'
      into synthesized_message
    from unnest(cleaned_areas) as area;

    if nullif(trim(coalesce(p_note, '')), '') is not null then
      synthesized_message := synthesized_message || E'\n\nNote : ' || trim(p_note);
    end if;
  end if;

  insert into public.feedback (
    company_id,
    actor_id,
    actor_name,
    page,
    kind,
    message,
    source,
    usage_date,
    problem_areas,
    no_problem,
    suggestion
  )
  values (
    current_profile.company_id,
    current_profile.id,
    current_profile.full_name,
    left(p_page, 120),
    case
      when not p_no_problem then 'bug'
      when nullif(trim(coalesce(p_suggestion, '')), '') is not null then 'idee'
      else 'avis'
    end,
    left(synthesized_message, 2000),
    'daily_prompt',
    p_usage_date,
    cleaned_areas,
    p_no_problem,
    nullif(left(trim(coalesce(p_suggestion, '')), 2000), '')
  )
  on conflict (actor_id, usage_date)
    where source = 'daily_prompt' and actor_id is not null and usage_date is not null
  do nothing;
end;
$$;

revoke all on function public.get_daily_feedback_prompt() from public, anon;
revoke all on function public.submit_daily_feedback(date, text[], boolean, text, text, text) from public, anon;
grant execute on function public.get_daily_feedback_prompt() to authenticated;
grant execute on function public.submit_daily_feedback(date, text[], boolean, text, text, text) to authenticated;

notify pgrst, 'reload schema';
