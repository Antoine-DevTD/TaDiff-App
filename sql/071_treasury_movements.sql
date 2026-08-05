-- 071 - Journal de tresorerie reel et rattachement aux spectacles

create table if not exists public.treasury_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid references public.shows(id) on delete set null,
  fixed_cost_id uuid references public.fixed_costs(id) on delete set null,
  label text not null check (char_length(label) between 2 and 160),
  direction text not null check (direction in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  movement_date date not null,
  reliability text not null default 'secured'
    check (reliability in ('secured', 'probable', 'uncertain')),
  status text not null default 'planned'
    check (status in ('planned', 'paid', 'cancelled')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treasury_movements_company_date_idx
  on public.treasury_movements(company_id, movement_date, status);
create index if not exists treasury_movements_show_idx
  on public.treasury_movements(show_id) where show_id is not null;

alter table public.treasury_movements enable row level security;

create policy "members read treasury movements" on public.treasury_movements
for select to authenticated using (public.is_company_member(company_id));

create policy "writers create treasury movements" on public.treasury_movements
for insert to authenticated with check (
  public.is_company_member(company_id)
  and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = treasury_movements.company_id and role in ('owner', 'admin', 'member'))
);

create policy "writers update treasury movements" on public.treasury_movements
for update to authenticated
using (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = treasury_movements.company_id and role in ('owner', 'admin', 'member')))
with check (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = treasury_movements.company_id and role in ('owner', 'admin', 'member')));

create policy "writers delete treasury movements" on public.treasury_movements
for delete to authenticated
using (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = treasury_movements.company_id and role in ('owner', 'admin', 'member')));

grant select, insert, update, delete on public.treasury_movements to authenticated;
