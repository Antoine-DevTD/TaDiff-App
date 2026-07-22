-- 053 - Horaires et lieux des evenements d'agenda

alter table public.calendar_events
  add column if not exists all_day boolean not null default true,
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone,
  add column if not exists location text;

alter table public.calendar_events
  drop constraint if exists calendar_events_time_consistency;

alter table public.calendar_events
  add constraint calendar_events_time_consistency check (
    all_day
    or start_time is not null
  );

