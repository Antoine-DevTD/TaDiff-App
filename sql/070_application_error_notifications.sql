-- 070 - Centre interne d'erreurs groupées

create table if not exists public.application_error_groups (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique check (char_length(fingerprint) between 16 and 128),
  message text not null check (char_length(message) between 1 and 1000),
  error_code text not null default '',
  route text not null default '',
  source text not null default 'application',
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  company_ids uuid[] not null default '{}',
  reporter_emails text[] not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_error_groups_status_idx
  on public.application_error_groups(resolved_at, last_seen_at desc);

alter table public.application_error_groups enable row level security;

create policy "platform admins read application errors"
  on public.application_error_groups for select to authenticated
  using (public.is_super_admin_user() or public.has_platform_permission('manage_feedback'));

create policy "platform admins update application errors"
  on public.application_error_groups for update to authenticated
  using (public.is_super_admin_user() or public.has_platform_permission('manage_feedback'))
  with check (public.is_super_admin_user() or public.has_platform_permission('manage_feedback'));

revoke all on public.application_error_groups from anon, authenticated;
grant select, update on public.application_error_groups to authenticated;
