-- 046 - Captation, limites de spectacles actifs et documents de travail.

alter table public.shows add column if not exists capture_url text;

alter table public.show_documents drop constraint if exists show_documents_document_type_check;
alter table public.show_documents add constraint show_documents_document_type_check
  check (document_type in (
    'Affiche', 'Dossier artistique', 'Note d''intention', 'Synopsis', 'Texte',
    'Budget', 'Fiche technique', 'RIB', 'Statuts', 'Devis', 'A renseigner'
  ));

create or replace function public.enforce_active_show_plan_limit()
returns trigger language plpgsql set search_path = public
as $$
declare
  company_plan text;
  active_limit integer;
  active_count integer;
begin
  if new.status = 'En pause' then return new; end if;
  select coalesce(plan_code, 'beta') into company_plan from public.companies where id = new.company_id;
  active_limit := case
    when company_plan in ('studio', 'unlimited', 'founder') then null
    when company_plan in ('pro', 'compagnie') then 5
    else 2
  end;
  if active_limit is null then return new; end if;
  select count(*) into active_count from public.shows
  where company_id = new.company_id and status <> 'En pause' and id <> coalesce(new.id, gen_random_uuid());
  if active_count >= active_limit then
    raise exception 'Limite de % spectacles actifs atteinte pour la formule %.', active_limit, company_plan;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_active_show_plan_limit_trigger on public.shows;
create trigger enforce_active_show_plan_limit_trigger
before insert or update of status on public.shows
for each row execute function public.enforce_active_show_plan_limit();

create table if not exists public.show_work_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  parent_id uuid references public.show_work_folders(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.show_work_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  folder_id uuid references public.show_work_folders(id) on delete set null,
  title text not null,
  storage_path text not null,
  storage_provider text not null default 'supabase' check (storage_provider in ('supabase', 'r2')),
  mime_type text,
  file_size bigint not null default 0,
  version_number integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.show_work_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.show_work_documents(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_path text not null,
  storage_provider text not null default 'supabase' check (storage_provider in ('supabase', 'r2')),
  mime_type text,
  file_size bigint not null default 0,
  version_number integer not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(document_id, version_number)
);

create index if not exists show_work_folders_show_idx on public.show_work_folders(show_id, parent_id);
create index if not exists show_work_documents_show_idx on public.show_work_documents(show_id, folder_id);
create index if not exists show_work_versions_document_idx on public.show_work_document_versions(document_id, version_number desc);

alter table public.show_work_folders enable row level security;
alter table public.show_work_documents enable row level security;
alter table public.show_work_document_versions enable row level security;

create policy "members manage show work folders" on public.show_work_folders for all to authenticated
using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members manage show work documents" on public.show_work_documents for all to authenticated
using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members manage show work versions" on public.show_work_document_versions for all to authenticated
using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

grant select, insert, update, delete on public.show_work_folders to authenticated;
grant select, insert, update, delete on public.show_work_documents to authenticated;
grant select, insert, update, delete on public.show_work_document_versions to authenticated;
