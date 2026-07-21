-- 043 - Mesure privee et limitee des usages de William

create table if not exists public.william_question_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_excerpt text not null check (char_length(question_excerpt) between 1 and 500),
  topic text not null check (topic in ('actions', 'spectacles', 'diffusion', 'emails', 'documents', 'finances', 'aides', 'agenda', 'tadiff', 'autre')),
  request_kind text not null default 'assistant',
  answered boolean not null default true,
  out_of_scope boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists william_question_events_created_at_idx
  on public.william_question_events(created_at desc);
create index if not exists william_question_events_topic_created_at_idx
  on public.william_question_events(topic, created_at desc);

alter table public.william_question_events enable row level security;

drop policy if exists "Members can record their William questions" on public.william_question_events;
create policy "Members can record their William questions"
on public.william_question_events
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_company_member(company_id)
);

drop policy if exists "Super admins can read William question analytics" on public.william_question_events;
create policy "Super admins can read William question analytics"
on public.william_question_events
for select
to authenticated
using ((select public.is_super_admin_user()));

grant insert, select on public.william_question_events to authenticated;

create or replace function public.purge_old_william_question_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.william_question_events
  where created_at < now() - interval '90 days';
  return new;
end;
$$;

drop trigger if exists purge_old_william_question_events_trigger on public.william_question_events;
create trigger purge_old_william_question_events_trigger
after insert on public.william_question_events
for each statement execute function public.purge_old_william_question_events();

revoke all on function public.purge_old_william_question_events() from public;
