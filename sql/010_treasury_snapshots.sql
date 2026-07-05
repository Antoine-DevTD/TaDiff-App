-- 010 - Saisie du solde de tresorerie
--
-- Objectif : remplacer le solde de demonstration code en dur par une vraie
-- saisie compagnie. Chaque saisie est conservee (historique), le cockpit et
-- les projections lisent la plus recente.

create table if not exists public.treasury_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  balance numeric(12, 2) not null,
  recorded_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists treasury_snapshots_company_id_idx
  on public.treasury_snapshots(company_id);
create index if not exists treasury_snapshots_recorded_on_idx
  on public.treasury_snapshots(company_id, recorded_on desc, created_at desc);

alter table public.treasury_snapshots enable row level security;

drop policy if exists "members can manage treasury snapshots" on public.treasury_snapshots;
create policy "members can manage treasury snapshots"
  on public.treasury_snapshots for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
