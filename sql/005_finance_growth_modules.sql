create table if not exists public.show_cost_profiles (
  show_id uuid primary key references public.shows(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  artist_fees numeric(12, 2) not null default 0,
  technical_fees numeric(12, 2) not null default 0,
  rights numeric(12, 2) not null default 0,
  production numeric(12, 2) not null default 0,
  transport_per_km numeric(8, 2) not null default 0.45,
  hotel_per_night numeric(8, 2) not null default 90,
  social_charges_rate numeric(5, 4) not null default 0.05,
  tour_commission_rate numeric(5, 4) not null default 0.08,
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_packs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  multiplier numeric(5, 2) not null default 1,
  includes text[] not null default '{}',
  recommended_for text,
  created_at timestamptz not null default now()
);

create table if not exists public.grant_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid references public.shows(id) on delete set null,
  title text not null,
  funder text not null,
  territory text,
  discipline text,
  deadline date not null,
  amount numeric(12, 2) not null default 0,
  status text not null default 'A surveiller'
    check (status in ('A surveiller', 'En montage', 'Depose', 'Attribue')),
  created_at timestamptz not null default now()
);

create table if not exists public.patronage_deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  contact_name text,
  amount numeric(12, 2) not null default 0,
  status text not null default 'Prospect'
    check (status in ('Prospect', 'Argumentaire', 'Negociation', 'Signe')),
  next_action text,
  next_follow_up_at date,
  pack_id uuid references public.commercial_packs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  template text not null,
  audience text,
  status text not null default 'Brouillon'
    check (status in ('Brouillon', 'Prete', 'Envoyee')),
  sent_count integer not null default 0,
  open_rate numeric(5, 2) not null default 0,
  next_send_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  number text not null,
  title text not null,
  organization text,
  amount numeric(12, 2) not null default 0,
  deposit_due numeric(12, 2) not null default 0,
  balance_due numeric(12, 2) not null default 0,
  status text not null default 'A preparer'
    check (status in ('A preparer', 'Envoye', 'Acompte attendu', 'Solde attendu', 'Archive')),
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists grant_opportunities_deadline_idx on public.grant_opportunities(deadline);
create index if not exists patronage_deals_next_follow_up_idx on public.patronage_deals(next_follow_up_at);
create index if not exists email_campaigns_status_idx on public.email_campaigns(status);
create index if not exists quotes_due_date_idx on public.quotes(due_date);

alter table public.show_cost_profiles enable row level security;
alter table public.commercial_packs enable row level security;
alter table public.grant_opportunities enable row level security;
alter table public.patronage_deals enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "members can manage show cost profiles" on public.show_cost_profiles;
create policy "members can manage show cost profiles"
  on public.show_cost_profiles for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage commercial packs" on public.commercial_packs;
create policy "members can manage commercial packs"
  on public.commercial_packs for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage grant opportunities" on public.grant_opportunities;
create policy "members can manage grant opportunities"
  on public.grant_opportunities for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage patronage deals" on public.patronage_deals;
create policy "members can manage patronage deals"
  on public.patronage_deals for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage email campaigns" on public.email_campaigns;
create policy "members can manage email campaigns"
  on public.email_campaigns for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage quotes" on public.quotes;
create policy "members can manage quotes"
  on public.quotes for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
