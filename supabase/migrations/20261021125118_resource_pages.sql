-- 091 - Pages de ressources, brouillons privés et publications séparées.
-- Prérequis : 044 (manage_catalogs), company_has_access et Supabase Storage
-- avec storage.allow_only_operation(text). Aucune table métier existante modifiée.
begin;

create schema if not exists resource_private;
revoke all on schema resource_private from public, anon, authenticated;
grant usage on schema resource_private to anon, authenticated;

create table if not exists public.resource_pages (
  id uuid primary key default gen_random_uuid(),
  draft jsonb not null,
  slug text not null unique,
  revision integer not null default 1 check (revision > 0),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.resource_publications (
  id uuid primary key references public.resource_pages(id) on delete cascade,
  document jsonb not null,
  slug text not null unique,
  visibility text not null check (visibility in ('public', 'members')),
  asset_ids uuid[] not null default '{}',
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.resource_assets (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.resource_pages(id) on delete cascade,
  name text not null check (length(name) between 1 and 240),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain')),
  size integer not null check (size between 1 and 4194304),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint resource_asset_path check (storage_path ~ ('^' || page_id::text || '/' || id::text || '\.(jpg|jpeg|png|webp|gif|pdf|docx|xlsx|csv|txt)$'))
);
create index if not exists resource_assets_page_idx on public.resource_assets(page_id);
create table if not exists public.resource_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.resource_pages(id) on delete cascade,
  revision integer not null,
  document jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (page_id, revision)
);

-- Private helpers perform only narrowly scoped checks; no JWT user_metadata.
create or replace function resource_private.can_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is null then false else public.has_platform_permission('manage_catalogs') end;
$$;
create or replace function resource_private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and public.company_has_access(p.company_id)
  );
$$;
create or replace function resource_private.can_read_asset(asset uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select resource_private.can_edit() or exists (
    select 1 from public.resource_assets a join public.resource_publications p on p.id = a.page_id
    where a.id = asset and a.id = any(p.asset_ids)
      and (p.visibility = 'public' or resource_private.is_member())
  );
$$;
create or replace function resource_private.document_asset_ids(document jsonb) returns uuid[]
language sql immutable set search_path = '' as $$
  with recursive nodes(value) as (
    select document
    union all
    select child.value from nodes n cross join lateral (
      select v as value from jsonb_each(case when jsonb_typeof(n.value) = 'object' then n.value else '{}'::jsonb end) e(k,v)
      union all
      select v from jsonb_array_elements(case when jsonb_typeof(n.value) = 'array' then n.value else '[]'::jsonb end) e(v)
    ) child
  ), ids as (
    select value->>'assetId' as id from nodes where jsonb_typeof(value) = 'object' and value->>'assetId' is not null
    union select document->>'coverAssetId' where document->>'coverAssetId' is not null
  ) select coalesce(array_agg(distinct id::uuid), '{}'::uuid[]) from ids;
$$;

alter table public.resource_pages enable row level security;
alter table public.resource_publications enable row level security;
alter table public.resource_assets enable row level security;
alter table public.resource_revisions enable row level security;
revoke all on public.resource_pages, public.resource_publications, public.resource_assets, public.resource_revisions from public, anon, authenticated;
grant select on public.resource_pages, public.resource_revisions to authenticated;
grant select on public.resource_publications, public.resource_assets to anon, authenticated;
grant insert on public.resource_assets to authenticated;
drop policy if exists resource_pages_read on public.resource_pages;
create policy resource_pages_read on public.resource_pages for select to authenticated using ((select resource_private.can_edit()));
drop policy if exists resource_revisions_read on public.resource_revisions;
create policy resource_revisions_read on public.resource_revisions for select to authenticated using ((select resource_private.can_edit()));
drop policy if exists resource_publications_read on public.resource_publications;
create policy resource_publications_read on public.resource_publications for select to anon, authenticated
  using (visibility = 'public' or (select resource_private.can_edit()) or (select resource_private.is_member()));
drop policy if exists resource_assets_read on public.resource_assets;
create policy resource_assets_read on public.resource_assets for select to anon, authenticated using (resource_private.can_read_asset(id));
drop policy if exists resource_assets_insert on public.resource_assets;
create policy resource_assets_insert on public.resource_assets for insert to authenticated with check ((select resource_private.can_edit()));

-- All page mutations are atomic and version checked. Direct table writes remain
-- revoked, including for editors, so REST cannot skip concurrency or publication checks.
create or replace function resource_private.mutate_page(p_id uuid, p_document jsonb, p_expected_revision integer, p_action text, p_revision_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_page public.resource_pages; doc jsonb; assets uuid[]; result public.resource_pages;
begin
  if auth.uid() is null or not resource_private.can_edit() then raise exception 'resource_forbidden' using errcode='42501'; end if;
  if p_id is null or p_action not in ('save','publish','unpublish','restore') then raise exception 'resource_invalid'; end if;
  -- Lock the page even before creation, so concurrent creation also becomes a conflict.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 901));
  select * into current_page from public.resource_pages where id = p_id for update;
  if (current_page.id is null and p_expected_revision is not null) or
     (current_page.id is not null and p_expected_revision is distinct from current_page.revision) then
    raise exception 'resource_conflict' using errcode='40001';
  end if;
  if p_action in ('restore','unpublish') and current_page.id is null then raise exception 'resource_missing'; end if;
  doc := p_document;
  if p_action = 'restore' then
    select document into doc from public.resource_revisions where id=p_revision_id and page_id=p_id;
    if doc is null then raise exception 'resource_revision_missing'; end if;
  elsif p_action = 'unpublish' then doc := current_page.draft;
  end if;
  if doc is null or jsonb_typeof(doc) <> 'object' or doc->>'version' is distinct from '1'
    or jsonb_typeof(doc->'blocks') is distinct from 'array' or jsonb_array_length(doc->'blocks') > 100
    or doc->>'visibility' not in ('public','members') or doc->>'visibility' is null
    or coalesce(doc->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(doc->>'slug') > 100
    or length(coalesce(doc->>'title','')) not between 1 and 180
    or octet_length(doc::text) > 500000 then raise exception 'resource_invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(doc->>'slug', 902));
  if exists(select 1 from public.resource_pages where slug=doc->>'slug' and id<>p_id)
    or exists(select 1 from public.resource_publications where slug=doc->>'slug' and id<>p_id) then
    raise exception 'resource_slug_taken' using errcode='23505';
  end if;
  assets := resource_private.document_asset_ids(doc);
  if exists(select 1 from unnest(assets) a(id) where not exists (
    select 1 from public.resource_assets ra where ra.id=a.id and ra.page_id=p_id
  )) then raise exception 'resource_asset_invalid'; end if;
  if p_action='publish' and (length(btrim(doc->>'title'))=0 or jsonb_array_length(doc->'blocks')=0) then
    raise exception 'resource_invalid';
  end if;
  insert into public.resource_pages(id,draft,slug,revision,created_by)
    values(p_id,doc,doc->>'slug',1,auth.uid())
  on conflict(id) do update set draft=excluded.draft,slug=excluded.slug,
    revision=public.resource_pages.revision+1,updated_at=now();
  if p_action='publish' then
    insert into public.resource_publications(id,document,slug,visibility,asset_ids)
      values(p_id,doc,doc->>'slug',doc->>'visibility',assets)
    on conflict(id) do update set document=excluded.document,slug=excluded.slug,
      visibility=excluded.visibility,asset_ids=excluded.asset_ids,updated_at=now();
    update public.resource_pages set published_at=(select published_at from public.resource_publications where id=p_id) where id=p_id;
  elsif p_action='unpublish' then
    delete from public.resource_publications where id=p_id;
    update public.resource_pages set published_at=null where id=p_id;
  end if;
  select * into result from public.resource_pages where id=p_id;
  insert into public.resource_revisions(page_id,revision,document,created_by)
    values(p_id,result.revision,result.draft,auth.uid());
  return to_jsonb(result) - 'created_by' - 'slug';
end;
$$;
create or replace function public.mutate_resource_page(p_id uuid, p_document jsonb, p_expected_revision integer, p_action text, p_revision_id uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select resource_private.mutate_page(p_id,p_document,p_expected_revision,p_action,p_revision_id);
$$;

revoke all on all functions in schema resource_private from public, anon, authenticated;
grant execute on function resource_private.can_edit(), resource_private.is_member(), resource_private.can_read_asset(uuid) to anon, authenticated;
grant execute on function resource_private.mutate_page(uuid,jsonb,integer,text,uuid) to authenticated;
revoke all on function public.mutate_resource_page(uuid,jsonb,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.mutate_resource_page(uuid,jsonb,integer,text,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('resource-media','resource-media',false,4194304,array['image/jpeg','image/png','image/webp','image/gif','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- No UPDATE permission: uploaded objects are immutable. No signed URLs, including
-- through direct Storage calls; each download rechecks the live publication.
drop policy if exists resource_media_read on storage.objects;
create policy resource_media_read on storage.objects for select to anon, authenticated using (
  bucket_id='resource-media' and (
    (storage.allow_only_operation('object.get_authenticated') and exists(select 1 from public.resource_assets a where a.storage_path=storage.objects.name))
    or ((storage.allow_only_operation('object.delete') or storage.allow_only_operation('object.delete_many'))
      and (select resource_private.can_edit()) and not exists(select 1 from public.resource_assets a where a.storage_path=storage.objects.name))
  )
);
drop policy if exists resource_media_insert on storage.objects;
create policy resource_media_insert on storage.objects for insert to authenticated with check (
  bucket_id='resource-media' and (select resource_private.can_edit())
  and exists(select 1 from public.resource_pages p where p.id::text=split_part(storage.objects.name,'/',1))
);
-- Only failed uploads without metadata can be cleaned up. Published/history
-- attachments cannot be removed or overwritten by an ordinary API request.
drop policy if exists resource_media_cleanup on storage.objects;
create policy resource_media_cleanup on storage.objects for delete to authenticated using (
  bucket_id='resource-media' and (select resource_private.can_edit())
  and not exists(select 1 from public.resource_assets a where a.storage_path=storage.objects.name)
);
commit;
