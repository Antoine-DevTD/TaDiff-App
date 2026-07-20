-- 037 - Modeles d'emails personnalises par compagnie

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  message_type text not null default 'first-touch'
    check (message_type in ('first-touch', 'follow-up', 'date-option')),
  subject_template text not null,
  body_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_templates_company_idx
  on public.email_templates(company_id, updated_at desc);

alter table public.email_templates enable row level security;

drop policy if exists "members can manage email templates" on public.email_templates;
drop policy if exists "members can read email templates" on public.email_templates;
drop policy if exists "writers can create email templates" on public.email_templates;
drop policy if exists "writers can update email templates" on public.email_templates;
drop policy if exists "writers can delete email templates" on public.email_templates;

create policy "members can read email templates"
  on public.email_templates for select
  using (public.is_company_member(company_id));

create policy "writers can create email templates"
  on public.email_templates for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.company_id = email_templates.company_id
        and profiles.role in ('owner', 'admin', 'member')
    )
  );

create policy "writers can update email templates"
  on public.email_templates for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.company_id = email_templates.company_id
        and profiles.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.company_id = email_templates.company_id
        and profiles.role in ('owner', 'admin', 'member')
    )
  );

create policy "writers can delete email templates"
  on public.email_templates for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.company_id = email_templates.company_id
        and profiles.role in ('owner', 'admin', 'member')
    )
  );
