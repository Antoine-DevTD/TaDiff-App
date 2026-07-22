-- 050 - Resultats et historique durable des actions

alter table public.reminders
  add column if not exists completion_outcome text,
  add column if not exists completion_note text;

alter table public.reminders
  drop constraint if exists reminders_completion_outcome_check;

alter table public.reminders
  add constraint reminders_completion_outcome_check
  check (
    completion_outcome is null
    or completion_outcome in ('positive', 'follow_up', 'no_answer', 'negative', 'other')
  );

create table if not exists public.reminder_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  show_id uuid references public.shows(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  reminder_title text not null,
  event_type text not null check (event_type in ('created', 'completed', 'reopened', 'rescheduled')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reminder_events_company_created_at_idx
  on public.reminder_events(company_id, created_at desc);
create index if not exists reminder_events_reminder_created_at_idx
  on public.reminder_events(reminder_id, created_at desc);
create index if not exists reminder_events_rescheduled_idx
  on public.reminder_events(company_id, reminder_id)
  where event_type = 'rescheduled';

alter table public.reminder_events enable row level security;

drop policy if exists "members can read reminder events" on public.reminder_events;
create policy "members can read reminder events"
  on public.reminder_events for select
  to authenticated
  using (public.is_company_member(company_id));

drop policy if exists "members can insert reminder events" on public.reminder_events;
create policy "members can insert reminder events"
  on public.reminder_events for insert
  to authenticated
  with check (
    public.is_company_member(company_id)
    and (user_id is null or user_id = (select auth.uid()))
  );

grant select, insert on public.reminder_events to authenticated;

create or replace function public.record_reminder_history()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.reminder_events (
      company_id, reminder_id, user_id, show_id, contact_id,
      reminder_title, event_type, metadata
    ) values (
      new.company_id, new.id, (select auth.uid()), new.show_id, new.contact_id,
      new.title, 'created', jsonb_build_object('due_date', new.due_date)
    );
    return new;
  end if;

  if old.due_date is distinct from new.due_date then
    insert into public.reminder_events (
      company_id, reminder_id, user_id, show_id, contact_id,
      reminder_title, event_type, metadata
    ) values (
      new.company_id, new.id, (select auth.uid()), new.show_id, new.contact_id,
      new.title, 'rescheduled', jsonb_build_object(
        'previous_due_date', old.due_date,
        'new_due_date', new.due_date
      )
    );
  end if;

  if old.done is false and new.done is true then
    insert into public.reminder_events (
      company_id, reminder_id, user_id, show_id, contact_id,
      reminder_title, event_type, note, metadata
    ) values (
      new.company_id, new.id, (select auth.uid()), new.show_id, new.contact_id,
      new.title, 'completed', new.completion_note, jsonb_build_object(
        'outcome', new.completion_outcome,
        'completed_at', new.completed_at
      )
    );
  elsif old.done is true and new.done is false then
    insert into public.reminder_events (
      company_id, reminder_id, user_id, show_id, contact_id,
      reminder_title, event_type, note, metadata
    ) values (
      new.company_id, new.id, (select auth.uid()), new.show_id, new.contact_id,
      new.title, 'reopened', old.completion_note, jsonb_build_object(
        'previous_outcome', old.completion_outcome,
        'previous_completed_at', old.completed_at
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists record_reminder_history_trigger on public.reminders;
create trigger record_reminder_history_trigger
after insert or update of due_date, done, completion_outcome, completion_note on public.reminders
for each row execute function public.record_reminder_history();

revoke all on function public.record_reminder_history() from public;
grant execute on function public.record_reminder_history() to authenticated;
