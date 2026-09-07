-- 081 - Feuille de route materiel par spectacle et par representation.

create table if not exists public.show_material_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  category text not null default 'accessoire'
    check (category in ('costume', 'accessoire', 'decor', 'technique', 'consommable', 'autre')),
  description text,
  owner_contact_id uuid references public.contacts(id) on delete set null,
  owner_label text,
  default_responsible_contact_id uuid references public.contacts(id) on delete set null,
  is_consumable boolean not null default false,
  quantity_owned numeric(10,2) not null default 0 check (quantity_owned >= 0),
  unit text not null default 'pièce',
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  photo_storage_path text,
  photo_storage_provider text check (photo_storage_provider in ('supabase', 'r2')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.show_material_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  material_item_id uuid not null references public.show_material_items(id) on delete cascade,
  performance_date date not null,
  performance_time time without time zone,
  venue text,
  quantity_needed numeric(10,2) not null default 1 check (quantity_needed > 0),
  responsible_contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'to_prepare'
    check (status in ('to_prepare', 'ready', 'to_buy', 'packed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(material_item_id, performance_date, performance_time)
);

create table if not exists public.material_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  performance_date date not null,
  responsible_contact_id uuid not null references public.contacts(id) on delete cascade,
  recipient_email text not null,
  sent_at timestamptz not null default now(),
  provider_message_id text,
  unique(show_id, performance_date, responsible_contact_id)
);

create unique index if not exists show_material_items_id_company_unique on public.show_material_items(id, company_id);
create unique index if not exists show_material_items_id_show_company_unique on public.show_material_items(id, show_id, company_id);
create unique index if not exists show_material_requirements_id_company_unique on public.show_material_requirements(id, company_id);
create index if not exists show_material_items_show_idx on public.show_material_items(show_id, active, name);
create index if not exists show_material_requirements_show_date_idx on public.show_material_requirements(show_id, performance_date, performance_time);
create index if not exists material_reminder_deliveries_date_idx on public.material_reminder_deliveries(performance_date, sent_at);

alter table public.show_material_items add constraint show_material_item_show_company_fk foreign key (show_id, company_id) references public.shows(id, company_id) on delete cascade;
alter table public.show_material_items add constraint show_material_item_owner_company_fk foreign key (owner_contact_id, company_id) references public.contacts(id, company_id) on delete set null (owner_contact_id);
alter table public.show_material_items add constraint show_material_item_responsible_company_fk foreign key (default_responsible_contact_id, company_id) references public.contacts(id, company_id) on delete set null (default_responsible_contact_id);
alter table public.show_material_requirements add constraint show_material_requirement_show_company_fk foreign key (show_id, company_id) references public.shows(id, company_id) on delete cascade;
alter table public.show_material_requirements add constraint show_material_requirement_item_show_company_fk foreign key (material_item_id, show_id, company_id) references public.show_material_items(id, show_id, company_id) on delete cascade;
alter table public.show_material_requirements add constraint show_material_requirement_responsible_company_fk foreign key (responsible_contact_id, company_id) references public.contacts(id, company_id) on delete set null (responsible_contact_id);
alter table public.material_reminder_deliveries add constraint material_reminder_show_company_fk foreign key (show_id, company_id) references public.shows(id, company_id) on delete cascade;
alter table public.material_reminder_deliveries add constraint material_reminder_contact_company_fk foreign key (responsible_contact_id, company_id) references public.contacts(id, company_id) on delete cascade;

alter table public.show_material_items enable row level security;
alter table public.show_material_requirements enable row level security;
alter table public.material_reminder_deliveries enable row level security;

create policy "company members read show material items" on public.show_material_items for select to authenticated using (public.is_company_member(company_id));
create policy "company writers manage show material items" on public.show_material_items for all to authenticated
using (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = show_material_items.company_id and role in ('owner', 'admin', 'member')))
with check (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = show_material_items.company_id and role in ('owner', 'admin', 'member')));
create policy "company members read show material requirements" on public.show_material_requirements for select to authenticated using (public.is_company_member(company_id));
create policy "company writers manage show material requirements" on public.show_material_requirements for all to authenticated
using (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = show_material_requirements.company_id and role in ('owner', 'admin', 'member')))
with check (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = show_material_requirements.company_id and role in ('owner', 'admin', 'member')));
create policy "company members read material reminder deliveries" on public.material_reminder_deliveries for select to authenticated using (public.is_company_member(company_id));

revoke all on table public.show_material_items, public.show_material_requirements, public.material_reminder_deliveries from anon;
grant select, insert, update, delete on table public.show_material_items, public.show_material_requirements to authenticated;
grant select on table public.material_reminder_deliveries to authenticated;
grant all on table public.show_material_items, public.show_material_requirements, public.material_reminder_deliveries to service_role;

notify pgrst, 'reload schema';
