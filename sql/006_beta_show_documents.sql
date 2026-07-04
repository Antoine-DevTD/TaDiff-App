alter table public.shows
  add column if not exists poster_url text;

create table if not exists public.show_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  title text not null,
  document_type text not null
    check (document_type in (
      'Affiche',
      'Dossier artistique',
      'Note d''intention',
      'Synopsis',
      'Texte',
      'Budget',
      'Fiche technique',
      'RIB',
      'Statuts',
      'Devis'
    )),
  status text not null default 'Manquant'
    check (status in ('Manquant', 'A mettre a jour', 'Pret')),
  file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  city text,
  discipline text not null,
  main_need text not null,
  status text not null
    check (status in ('reserved', 'waitlist')),
  "position" integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists beta_signups_email_idx
  on public.beta_signups(lower(email));

create index if not exists beta_signups_status_idx on public.beta_signups(status);
create index if not exists show_documents_show_id_idx on public.show_documents(show_id);
create index if not exists show_documents_company_id_idx on public.show_documents(company_id);

alter table public.show_documents enable row level security;
alter table public.beta_signups enable row level security;

drop policy if exists "members can manage show documents" on public.show_documents;
create policy "members can manage show documents"
  on public.show_documents for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

create or replace function public.register_beta_signup(
  signup_company_name text,
  signup_contact_name text,
  signup_email text,
  signup_phone text,
  signup_city text,
  signup_discipline text,
  signup_main_need text
)
returns table(status text, "position" integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(signup_email));
  next_position integer;
  next_status text;
begin
  return query
    select beta_signups.status, beta_signups."position"
    from public.beta_signups
    where lower(beta_signups.email) = normalized_email
    limit 1;

  if found then
    return;
  end if;

  select count(*) + 1
    into next_position
    from public.beta_signups;

  if next_position <= 10 then
    next_status := 'reserved';
  else
    next_status := 'waitlist';
  end if;

  insert into public.beta_signups (
    company_name,
    contact_name,
    email,
    phone,
    city,
    discipline,
    main_need,
    status,
    "position"
  )
  values (
    trim(signup_company_name),
    trim(signup_contact_name),
    normalized_email,
    nullif(trim(signup_phone), ''),
    nullif(trim(signup_city), ''),
    trim(signup_discipline),
    trim(signup_main_need),
    next_status,
    next_position
  );

  status := next_status;
  "position" := next_position;
  return next;
end;
$$;

create or replace function public.get_beta_signup_stats()
returns table(reserved_count integer, waitlist_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where status = 'reserved')::integer as reserved_count,
    count(*) filter (where status = 'waitlist')::integer as waitlist_count
  from public.beta_signups;
$$;

grant execute on function public.register_beta_signup(text, text, text, text, text, text, text)
  to anon, authenticated;

grant execute on function public.get_beta_signup_stats()
  to anon, authenticated;
