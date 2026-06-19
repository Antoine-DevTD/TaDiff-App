create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  discipline text not null,
  status text not null default 'En diffusion'
    check (status in ('En diffusion', 'Creation', 'En pause')),
  next_date date,
  budget numeric(12, 2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  organization text not null,
  role text,
  email text,
  city text,
  status text not null default 'Prospect'
    check (status in ('Prospect', 'En discussion', 'Partenaire')),
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  show_id uuid references public.shows(id) on delete set null,
  title text not null,
  stage text not null default 'A qualifier',
  value numeric(12, 2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  due_date date not null,
  related_to text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists shows_company_id_idx on public.shows(company_id);
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists opportunities_company_id_idx on public.opportunities(company_id);
create index if not exists reminders_company_id_idx on public.reminders(company_id);

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.shows enable row level security;
alter table public.contacts enable row level security;
alter table public.opportunities enable row level security;
alter table public.reminders enable row level security;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = target_company_id
  );
$$;

drop policy if exists "members can read companies" on public.companies;
create policy "members can read companies"
  on public.companies for select
  using (public.is_company_member(id));

drop policy if exists "authenticated users can create companies" on public.companies;
create policy "authenticated users can create companies"
  on public.companies for insert
  to authenticated
  with check (true);

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "members can manage shows" on public.shows;
create policy "members can manage shows"
  on public.shows for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage contacts" on public.contacts;
create policy "members can manage contacts"
  on public.contacts for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage opportunities" on public.opportunities;
create policy "members can manage opportunities"
  on public.opportunities for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can manage reminders" on public.reminders;
create policy "members can manage reminders"
  on public.reminders for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
