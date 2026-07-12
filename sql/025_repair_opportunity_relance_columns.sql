alter table public.opportunities
  add column if not exists next_action text,
  add column if not exists next_follow_up_at date,
  add column if not exists lost_reason text;

alter table public.reminders
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists priority text not null default 'normal';

create index if not exists opportunities_next_follow_up_at_idx
  on public.opportunities(next_follow_up_at);

create index if not exists reminders_opportunity_id_idx
  on public.reminders(opportunity_id);

create index if not exists reminders_contact_id_idx
  on public.reminders(contact_id);
