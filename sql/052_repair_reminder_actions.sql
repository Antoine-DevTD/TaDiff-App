-- 052 - Repare la lecture/ecriture des actions et isole leur journalisation.

alter table public.reminders
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists completed_at timestamptz,
  add column if not exists show_id uuid references public.shows(id) on delete set null,
  add column if not exists action_type text not null default 'other',
  add column if not exists completion_outcome text,
  add column if not exists completion_note text;

create index if not exists reminders_company_show_due_idx
  on public.reminders(company_id, show_id, due_date)
  where done = false;

-- Le trigger s'execute uniquement apres une ecriture deja autorisee par la RLS
-- de reminders. Il journalise ensuite avec les droits du proprietaire, afin
-- qu'une policy de reminder_events ne puisse pas annuler l'action metier.
create or replace function public.record_reminder_history()
returns trigger
language plpgsql
security definer
set search_path = public, auth
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

revoke all on function public.record_reminder_history() from public;
revoke all on function public.record_reminder_history() from anon;
revoke all on function public.record_reminder_history() from authenticated;

notify pgrst, 'reload schema';
