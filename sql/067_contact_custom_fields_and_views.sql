-- 067 - Champs personnalises Contacts/Lieux et preferences de colonnes.

alter table public.contacts drop constraint if exists contacts_status_check;
alter table public.contacts add constraint contacts_status_check
  check (status in ('Prospect', 'Premier contact', 'En discussion', 'Refus', 'Partenaire'));

create unique index if not exists contacts_id_company_unique
  on public.contacts(id, company_id);

create table if not exists public.contact_custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  field_key text not null,
  label text not null,
  applies_to text not null default 'both' check (applies_to in ('person', 'venue', 'both')),
  field_type text not null check (field_type in ('text', 'number', 'date', 'url', 'select')),
  options text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, field_key),
  unique(id, company_id),
  check (field_key ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  check (char_length(label) between 1 and 80),
  check (cardinality(options) <= 30)
);

create table if not exists public.contact_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid not null,
  definition_id uuid not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  unique(contact_id, definition_id),
  foreign key (contact_id, company_id) references public.contacts(id, company_id) on delete cascade,
  foreign key (definition_id, company_id) references public.contact_custom_field_definitions(id, company_id) on delete cascade,
  check (char_length(value) <= 2000)
);

create table if not exists public.contact_table_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_type text not null check (contact_type in ('person', 'venue')),
  visible_columns text[] not null default '{}',
  column_order text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique(user_id, company_id, contact_type),
  check (cardinality(visible_columns) <= 100),
  check (cardinality(column_order) <= 100)
);

create index if not exists contact_custom_definitions_company_idx
  on public.contact_custom_field_definitions(company_id, applies_to, sort_order);
create index if not exists contact_custom_values_contact_idx
  on public.contact_custom_field_values(company_id, contact_id);
create index if not exists contact_table_preferences_lookup_idx
  on public.contact_table_preferences(user_id, company_id, contact_type);

alter table public.contact_custom_field_definitions enable row level security;
alter table public.contact_custom_field_values enable row level security;
alter table public.contact_table_preferences enable row level security;

drop policy if exists "members manage contact custom definitions" on public.contact_custom_field_definitions;
create policy "members manage contact custom definitions"
  on public.contact_custom_field_definitions for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members manage contact custom values" on public.contact_custom_field_values;
create policy "members manage contact custom values"
  on public.contact_custom_field_values for all to authenticated
  using (public.is_company_member(company_id))
  with check (
    public.is_company_member(contact_custom_field_values.company_id)
    and exists (select 1 from public.contacts c where c.id = contact_custom_field_values.contact_id and c.company_id = contact_custom_field_values.company_id)
    and exists (select 1 from public.contact_custom_field_definitions d where d.id = contact_custom_field_values.definition_id and d.company_id = contact_custom_field_values.company_id)
  );

drop policy if exists "users manage own contact table preferences" on public.contact_table_preferences;
create policy "users manage own contact table preferences"
  on public.contact_table_preferences for all to authenticated
  using (auth.uid() = user_id and public.is_company_member(company_id))
  with check (auth.uid() = user_id and public.is_company_member(company_id));

revoke all on public.contact_custom_field_definitions, public.contact_custom_field_values, public.contact_table_preferences from anon;
grant select, insert, update, delete on public.contact_custom_field_definitions, public.contact_custom_field_values to authenticated;
grant select, insert, update, delete on public.contact_table_preferences to authenticated;
