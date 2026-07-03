create table if not exists public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  category text not null default 'Autre'
    check (category in (
      'Assurance',
      'Banque',
      'Comptable',
      'Stockage',
      'Logiciel',
      'Local',
      'Salaire',
      'Autre'
    )),
  amount numeric(12, 2) not null default 0,
  frequency text not null default 'Mensuel'
    check (frequency in ('Mensuel', 'Trimestriel', 'Annuel')),
  next_due_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists fixed_costs_company_id_idx on public.fixed_costs(company_id);
create index if not exists fixed_costs_next_due_date_idx on public.fixed_costs(next_due_date);

alter table public.fixed_costs enable row level security;

drop policy if exists "members can manage fixed costs" on public.fixed_costs;
create policy "members can manage fixed costs"
  on public.fixed_costs for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
