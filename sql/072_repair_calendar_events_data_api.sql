-- 072 - Repare l'agenda persistant et son exposition a la Data API
--
-- Certaines bases TaDiff n'ont jamais recu 017_calendar_events.sql. De plus,
-- les nouveaux reglages Supabase n'accordent plus automatiquement l'acces
-- PostgREST aux tables creees dans public. Cette migration est idempotente :
-- elle couvre une table absente, une ancienne table sans horaires et une table
-- existante sans droits explicites.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  event_date date not null,
  kind text not null default 'event',
  related_show_id uuid references public.shows(id) on delete set null,
  note text,
  all_day boolean not null default true,
  start_time time without time zone,
  end_time time without time zone,
  location text,
  created_at timestamptz not null default now()
);

alter table public.calendar_events
  add column if not exists all_day boolean not null default true,
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone,
  add column if not exists location text;

alter table public.calendar_events
  drop constraint if exists calendar_events_kind_check,
  drop constraint if exists calendar_events_time_consistency;

alter table public.calendar_events
  add constraint calendar_events_kind_check
    check (kind in ('event', 'deadline', 'show')),
  add constraint calendar_events_time_consistency
    check (all_day or start_time is not null);

create index if not exists calendar_events_company_id_idx
  on public.calendar_events(company_id);
create index if not exists calendar_events_date_idx
  on public.calendar_events(company_id, event_date);
create index if not exists calendar_events_show_idx
  on public.calendar_events(related_show_id)
  where related_show_id is not null;

alter table public.calendar_events enable row level security;

drop policy if exists "members can manage calendar events" on public.calendar_events;
drop policy if exists "members read calendar events" on public.calendar_events;
drop policy if exists "writers create calendar events" on public.calendar_events;
drop policy if exists "writers update calendar events" on public.calendar_events;
drop policy if exists "writers delete calendar events" on public.calendar_events;

create policy "members read calendar events"
  on public.calendar_events
  for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "writers create calendar events"
  on public.calendar_events
  for insert
  to authenticated
  with check (
    public.is_company_member(company_id)
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and company_id = calendar_events.company_id
        and role in ('owner', 'admin', 'member')
    )
  );

create policy "writers update calendar events"
  on public.calendar_events
  for update
  to authenticated
  using (
    public.is_company_member(company_id)
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and company_id = calendar_events.company_id
        and role in ('owner', 'admin', 'member')
    )
  )
  with check (
    public.is_company_member(company_id)
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and company_id = calendar_events.company_id
        and role in ('owner', 'admin', 'member')
    )
  );

create policy "writers delete calendar events"
  on public.calendar_events
  for delete
  to authenticated
  using (
    public.is_company_member(company_id)
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and company_id = calendar_events.company_id
        and role in ('owner', 'admin', 'member')
    )
  );

revoke all on table public.calendar_events from anon;
grant select, insert, update, delete on table public.calendar_events to authenticated;
grant all on table public.calendar_events to service_role;

-- Demande a PostgREST de relire immediatement le schema apres la migration.
notify pgrst, 'reload schema';
