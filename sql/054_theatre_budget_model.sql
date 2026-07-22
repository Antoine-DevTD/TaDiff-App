-- 054 - Hypotheses structurees et perimetre des lignes du budget theatre.

alter table public.show_budget_items
  add column if not exists scope text not null default 'creation'
  check (scope in ('creation', 'performance'));

create table if not exists public.show_budget_profiles (
  show_id uuid primary key references public.shows(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  convention text not null default 'Spectacle vivant prive - IDCC 3090',
  rate_source_url text,
  rate_effective_date date,
  performances_target integer not null default 20 check (performances_target between 1 and 10000),
  exploitation_mode text not null default 'cession' check (exploitation_mode in ('cession', 'revenue_share', 'rental')),
  cession_fee numeric(12, 2) not null default 0 check (cession_fee >= 0),
  venue_rental numeric(12, 2) not null default 0 check (venue_rental >= 0),
  minimum_guarantee numeric(12, 2) not null default 0 check (minimum_guarantee >= 0),
  company_share_percent numeric(5, 2) not null default 50 check (company_share_percent between 0 and 100),
  average_ticket_price numeric(10, 2) not null default 0 check (average_ticket_price >= 0),
  venue_capacity integer not null default 0 check (venue_capacity >= 0),
  expected_occupancy_percent numeric(5, 2) not null default 60 check (expected_occupancy_percent between 0 and 100),
  rights_territory text not null default 'outside_paris' check (rights_territory in ('paris', 'outside_paris')),
  author_rights_percent numeric(5, 2) not null default 10.5 check (author_rights_percent between 0 and 100),
  sacd_contribution_percent numeric(5, 2) not null default 2.1 check (sacd_contribution_percent between 0 and 100),
  director_rights_percent numeric(5, 2) not null default 0 check (director_rights_percent between 0 and 100),
  music_rights_percent numeric(5, 2) not null default 0 check (music_rights_percent between 0 and 100),
  overhead_percent numeric(5, 2) not null default 5 check (overhead_percent between 0 and 100),
  contingency_percent numeric(5, 2) not null default 5 check (contingency_percent between 0 and 100),
  cession_margin_percent numeric(5, 2) not null default 15 check (cession_margin_percent between 0 and 100),
  personnel jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists show_budget_profiles_company_idx on public.show_budget_profiles(company_id, show_id);
alter table public.show_budget_profiles enable row level security;

drop policy if exists "members can view show budget profiles" on public.show_budget_profiles;
create policy "members can view show budget profiles" on public.show_budget_profiles for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists "members can create show budget profiles" on public.show_budget_profiles;
create policy "members can create show budget profiles" on public.show_budget_profiles for insert to authenticated
  with check (public.is_company_member(company_id) and exists (
    select 1 from public.shows where shows.id = show_budget_profiles.show_id and shows.company_id = show_budget_profiles.company_id
  ));

drop policy if exists "members can update show budget profiles" on public.show_budget_profiles;
create policy "members can update show budget profiles" on public.show_budget_profiles for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id) and exists (
    select 1 from public.shows where shows.id = show_budget_profiles.show_id and shows.company_id = show_budget_profiles.company_id
  ));

grant select, insert, update on table public.show_budget_profiles to authenticated;
