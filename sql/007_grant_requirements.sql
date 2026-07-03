alter table public.grant_opportunities
  add column if not exists requirements text[] not null default '{}',
  add column if not exists eligibility text,
  add column if not exists source_url text,
  add column if not exists themes text[] not null default '{}';
