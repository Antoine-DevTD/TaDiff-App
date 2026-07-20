-- 038 - Console plateforme, catalogues globaux et fondation William/RAG

create extension if not exists vector with schema extensions;

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  public_read boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.grant_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  funder text not null,
  territory text,
  discipline text,
  deadline date,
  amount_max numeric(12, 2) not null default 0,
  eligibility text,
  requirements text[] not null default '{}',
  themes text[] not null default '{}',
  source_url text,
  active boolean not null default true,
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patronage_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  program_name text not null,
  themes text[] not null default '{}',
  territories text[] not null default '{}',
  next_deadline date,
  amount_min numeric(12, 2) not null default 0,
  amount_max numeric(12, 2) not null default 0,
  eligibility text,
  source_url text,
  notes text,
  active boolean not null default true,
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message_type text not null default 'first-touch'
    check (message_type in ('first-touch', 'follow-up', 'date-option')),
  subject_template text not null,
  body_json jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  provider text not null default 'deepseek'
    check (provider in ('deepseek', 'openai', 'anthropic')),
  model text not null default 'deepseek-chat',
  embedding_provider text not null default 'openai'
    check (embedding_provider in ('openai', 'supabase')),
  embedding_model text not null default 'text-embedding-3-small',
  rag_top_k integer not null default 8 check (rag_top_k between 1 and 30),
  system_prompt text not null default 'Tu es William, assistant des compagnies de spectacle vivant. Reponds clairement, cite les sources disponibles et ne presente jamais une hypothese comme un fait.',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  source_type text not null check (
    source_type in ('manual', 'grant_catalog', 'patronage_catalog', 'show', 'show_document', 'company_document')
  ),
  source_id uuid,
  title text not null,
  content text not null,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  search_vector tsvector generated always as (
    to_tsvector('french', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grant_catalog_active_deadline_idx
  on public.grant_catalog(active, deadline);
create index if not exists patronage_catalog_active_deadline_idx
  on public.patronage_catalog(active, next_deadline);
create index if not exists platform_email_templates_active_idx
  on public.platform_email_templates(active, updated_at desc);
create index if not exists rag_documents_company_idx
  on public.rag_documents(company_id, active);
create index if not exists rag_documents_search_idx
  on public.rag_documents using gin(search_vector);
create index if not exists rag_documents_embedding_idx
  on public.rag_documents using hnsw (embedding vector_cosine_ops)
  where embedding is not null;
create unique index if not exists rag_documents_global_source_idx
  on public.rag_documents(source_type, source_id)
  where company_id is null and source_id is not null;

alter table public.platform_settings enable row level security;
alter table public.grant_catalog enable row level security;
alter table public.patronage_catalog enable row level security;
alter table public.platform_email_templates enable row level security;
alter table public.ai_settings enable row level security;
alter table public.rag_documents enable row level security;

create policy "public settings are readable"
  on public.platform_settings for select
  to anon, authenticated
  using (public_read or (select public.is_super_admin_user()));
create policy "super admins manage platform settings"
  on public.platform_settings for all
  to authenticated
  using ((select public.is_super_admin_user()))
  with check ((select public.is_super_admin_user()));

create policy "authenticated users read active grant catalog"
  on public.grant_catalog for select
  to authenticated
  using (active or (select public.is_super_admin_user()));
create policy "super admins manage grant catalog"
  on public.grant_catalog for all
  to authenticated
  using ((select public.is_super_admin_user()))
  with check ((select public.is_super_admin_user()));

create policy "authenticated users read active patronage catalog"
  on public.patronage_catalog for select
  to authenticated
  using (active or (select public.is_super_admin_user()));
create policy "super admins manage patronage catalog"
  on public.patronage_catalog for all
  to authenticated
  using ((select public.is_super_admin_user()))
  with check ((select public.is_super_admin_user()));

create policy "authenticated users read active platform templates"
  on public.platform_email_templates for select
  to authenticated
  using (active or (select public.is_super_admin_user()));
create policy "super admins manage platform templates"
  on public.platform_email_templates for all
  to authenticated
  using ((select public.is_super_admin_user()))
  with check ((select public.is_super_admin_user()));

create policy "super admins manage ai settings"
  on public.ai_settings for all
  to authenticated
  using ((select public.is_super_admin_user()))
  with check ((select public.is_super_admin_user()));
create policy "authenticated users read ai settings"
  on public.ai_settings for select
  to authenticated
  using (true);

create policy "members read permitted rag documents"
  on public.rag_documents for select
  to authenticated
  using (
    active and (
      company_id is null
      or public.is_company_member(company_id)
      or (select public.is_super_admin_user())
    )
  );
create policy "super admins manage global rag documents"
  on public.rag_documents for all
  to authenticated
  using (company_id is null and (select public.is_super_admin_user()))
  with check (company_id is null and (select public.is_super_admin_user()));
create policy "company writers manage company rag documents"
  on public.rag_documents for all
  to authenticated
  using (
    company_id is not null and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.company_id = rag_documents.company_id
        and profiles.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    company_id is not null and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.company_id = rag_documents.company_id
        and profiles.role in ('owner', 'admin', 'member')
    )
  );

insert into public.platform_settings(key, value, public_read)
values (
  'legal_information',
  '{"serviceName":"TaDiff","operatorName":"ARKENCIEL Compagnie","operatorLegalForm":"Forme juridique a completer","operatorAddress":"Adresse du siege a completer","operatorRegistration":"SIREN et RCS a completer","operatorVat":"TVA a completer si applicable","publicationDirector":"Directeur de publication a completer","professionalPhone":"","legalEmail":"contact@tadiff.com","privacyEmail":"contact@tadiff.com","supportEmail":"contact@tadiff.com","billingEmail":"contact@tadiff.com","betaPrice":"19,99 EUR TTC par mois","legalVersion":"1.0"}'::jsonb,
  true
)
on conflict (key) do nothing;

insert into public.ai_settings(id) values (true)
on conflict (id) do nothing;

create or replace function public.sync_grant_catalog_rag()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.rag_documents
    where source_type = 'grant_catalog' and source_id = old.id and company_id is null;
    return old;
  end if;

  insert into public.rag_documents(
    company_id, source_type, source_id, title, content, source_url, metadata, active, updated_at
  ) values (
    null,
    'grant_catalog',
    new.id,
    new.title,
    concat_ws(E'\n',
      'Financeur : ' || new.funder,
      'Territoire : ' || coalesce(new.territory, ''),
      'Discipline : ' || coalesce(new.discipline, ''),
      'Date limite : ' || coalesce(new.deadline::text, 'a verifier'),
      'Montant maximal : ' || new.amount_max::text || ' EUR',
      'Eligibilite : ' || coalesce(new.eligibility, ''),
      'Pieces : ' || array_to_string(new.requirements, ', '),
      'Themes : ' || array_to_string(new.themes, ', ')
    ),
    new.source_url,
    jsonb_build_object('funder', new.funder, 'deadline', new.deadline, 'themes', new.themes),
    new.active,
    now()
  )
  on conflict (source_type, source_id) where company_id is null and source_id is not null
  do update set
    title = excluded.title,
    content = excluded.content,
    source_url = excluded.source_url,
    metadata = excluded.metadata,
    active = excluded.active,
    updated_at = now(),
    embedding = null;
  return new;
end;
$$;

create or replace function public.sync_patronage_catalog_rag()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.rag_documents
    where source_type = 'patronage_catalog' and source_id = old.id and company_id is null;
    return old;
  end if;

  insert into public.rag_documents(
    company_id, source_type, source_id, title, content, source_url, metadata, active, updated_at
  ) values (
    null,
    'patronage_catalog',
    new.id,
    new.organization_name || ' - ' || new.program_name,
    concat_ws(E'\n',
      'Organisation : ' || new.organization_name,
      'Programme : ' || new.program_name,
      'Themes : ' || array_to_string(new.themes, ', '),
      'Territoires : ' || array_to_string(new.territories, ', '),
      'Prochaine echeance : ' || coalesce(new.next_deadline::text, 'a verifier'),
      'Montants : ' || new.amount_min::text || ' a ' || new.amount_max::text || ' EUR',
      'Eligibilite : ' || coalesce(new.eligibility, ''),
      'Notes : ' || coalesce(new.notes, '')
    ),
    new.source_url,
    jsonb_build_object('organization', new.organization_name, 'deadline', new.next_deadline, 'themes', new.themes),
    new.active,
    now()
  )
  on conflict (source_type, source_id) where company_id is null and source_id is not null
  do update set
    title = excluded.title,
    content = excluded.content,
    source_url = excluded.source_url,
    metadata = excluded.metadata,
    active = excluded.active,
    updated_at = now(),
    embedding = null;
  return new;
end;
$$;

drop trigger if exists grant_catalog_rag_sync on public.grant_catalog;
create trigger grant_catalog_rag_sync
after insert or update or delete on public.grant_catalog
for each row execute function public.sync_grant_catalog_rag();

drop trigger if exists patronage_catalog_rag_sync on public.patronage_catalog;
create trigger patronage_catalog_rag_sync
after insert or update or delete on public.patronage_catalog
for each row execute function public.sync_patronage_catalog_rag();

create or replace function public.search_rag_documents(
  search_query text,
  target_company_id uuid default null,
  match_count integer default 8
)
returns table(
  id uuid,
  title text,
  content text,
  source_type text,
  source_url text,
  metadata jsonb,
  rank real
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    document.id,
    document.title,
    document.content,
    document.source_type,
    document.source_url,
    document.metadata,
    ts_rank_cd(document.search_vector, websearch_to_tsquery('french', search_query)) as rank
  from public.rag_documents document
  where document.active
    and (document.company_id is null or document.company_id = target_company_id)
    and document.search_vector @@ websearch_to_tsquery('french', search_query)
  order by rank desc, document.updated_at desc
  limit least(greatest(match_count, 1), 30);
$$;

create or replace function public.match_rag_documents(
  query_embedding extensions.vector(1536),
  target_company_id uuid default null,
  match_threshold double precision default 0.55,
  match_count integer default 8
)
returns table(
  id uuid,
  title text,
  content text,
  source_type text,
  source_url text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    document.id,
    document.title,
    document.content,
    document.source_type,
    document.source_url,
    document.metadata,
    1 - (document.embedding <=> query_embedding) as similarity
  from public.rag_documents document
  where document.active
    and document.embedding is not null
    and (document.company_id is null or document.company_id = target_company_id)
    and 1 - (document.embedding <=> query_embedding) >= match_threshold
  order by document.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 30);
$$;

grant select on public.platform_settings to anon, authenticated;
grant select, insert, update, delete on public.platform_settings to authenticated;
grant select, insert, update, delete on public.grant_catalog to authenticated;
grant select, insert, update, delete on public.patronage_catalog to authenticated;
grant select, insert, update, delete on public.platform_email_templates to authenticated;
grant select, insert, update, delete on public.ai_settings to authenticated;
grant select, insert, update, delete on public.rag_documents to authenticated;
grant execute on function public.search_rag_documents(text, uuid, integer) to authenticated;
grant execute on function public.match_rag_documents(extensions.vector, uuid, double precision, integer) to authenticated;

revoke all on function public.sync_grant_catalog_rag() from public;
revoke all on function public.sync_patronage_catalog_rag() from public;
