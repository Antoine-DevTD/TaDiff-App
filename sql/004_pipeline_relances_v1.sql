alter table public.opportunities
  add column if not exists probability integer not null default 20,
  add column if not exists next_action text,
  add column if not exists next_follow_up_at date,
  add column if not exists lost_reason text;

alter table public.opportunities
  drop constraint if exists opportunities_stage_check;

alter table public.opportunities
  add constraint opportunities_stage_check
  check (stage in ('A qualifier', 'Contacte', 'Relance prevue', 'Negociation', 'Confirme', 'Perdu'));

alter table public.opportunities
  drop constraint if exists opportunities_probability_check;

alter table public.opportunities
  add constraint opportunities_probability_check
  check (probability >= 0 and probability <= 100);

alter table public.reminders
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists completed_at timestamptz;

alter table public.reminders
  drop constraint if exists reminders_priority_check;

alter table public.reminders
  add constraint reminders_priority_check
  check (priority in ('low', 'normal', 'high'));

create index if not exists opportunities_stage_idx on public.opportunities(stage);
create index if not exists opportunities_next_follow_up_at_idx on public.opportunities(next_follow_up_at);
create index if not exists reminders_due_date_idx on public.reminders(due_date);
create index if not exists reminders_done_idx on public.reminders(done);
