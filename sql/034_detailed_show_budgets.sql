-- 034 - Budget detaille, volontairement simple, par spectacle.

alter table public.shows
  add column if not exists detailed_budget_enabled boolean not null default false;

create table if not exists public.show_budget_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  kind text not null check (kind in ('expense', 'revenue')),
  category text not null,
  label text not null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists show_budget_items_show_idx
  on public.show_budget_items(show_id, kind, sort_order, created_at);

create index if not exists show_budget_items_company_idx
  on public.show_budget_items(company_id, show_id);

alter table public.show_budget_items enable row level security;

drop policy if exists "members can view show budget items" on public.show_budget_items;
create policy "members can view show budget items"
  on public.show_budget_items for select
  to authenticated
  using (public.is_company_member(company_id));

drop policy if exists "members can create show budget items" on public.show_budget_items;
create policy "members can create show budget items"
  on public.show_budget_items for insert
  to authenticated
  with check (
    public.is_company_member(company_id)
    and exists (
      select 1
      from public.shows
      where shows.id = show_budget_items.show_id
        and shows.company_id = show_budget_items.company_id
    )
  );

drop policy if exists "members can update show budget items" on public.show_budget_items;
create policy "members can update show budget items"
  on public.show_budget_items for update
  to authenticated
  using (public.is_company_member(company_id))
  with check (
    public.is_company_member(company_id)
    and exists (
      select 1
      from public.shows
      where shows.id = show_budget_items.show_id
        and shows.company_id = show_budget_items.company_id
    )
  );

drop policy if exists "members can delete show budget items" on public.show_budget_items;
create policy "members can delete show budget items"
  on public.show_budget_items for delete
  to authenticated
  using (public.is_company_member(company_id));

grant select, insert, update, delete on table public.show_budget_items to authenticated;

