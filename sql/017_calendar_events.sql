-- 017 - Evenements d'agenda personnalises
--
-- Objectif : permettre d'ajouter au calendrier des evenements libres
-- (evenement, deadline perso, date liee a un spectacle) via un clic droit
-- sur un jour. Vient completer les dates deja calculees (spectacles,
-- relances, subventions, frais fixes).

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  event_date date not null,
  kind text not null default 'event'
    check (kind in ('event', 'deadline', 'show')),
  related_show_id uuid references public.shows(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_company_id_idx
  on public.calendar_events(company_id);
create index if not exists calendar_events_date_idx
  on public.calendar_events(company_id, event_date);

alter table public.calendar_events enable row level security;

drop policy if exists "members can manage calendar events" on public.calendar_events;
create policy "members can manage calendar events"
  on public.calendar_events for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
