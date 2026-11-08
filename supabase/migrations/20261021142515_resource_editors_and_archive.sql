-- 092 - Droit d’édition des ressources indépendant et archivage réversible.
-- Prérequis : 091_resource_pages.sql, 013_super_admin.sql.
-- Aucun rôle, accès plateforme, abonnement ni rattachement compagnie modifié.
begin;

create table if not exists public.resource_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.resource_editors enable row level security;
revoke all on public.resource_editors from public, anon, authenticated;

-- Existing policies call this helper: an entitlement revocation therefore takes
-- effect for drafts, history, assets and mutations on the next database request.
-- manage_catalogs deliberately grants no resource editing permission.
create or replace function resource_private.can_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    public.is_super_admin_user() or exists (
      select 1 from public.resource_editors e where e.user_id=auth.uid()
    )
  );
$$;
create or replace function public.can_edit_resources() returns boolean
language sql stable security invoker set search_path = '' as $$
  select resource_private.can_edit();
$$;
revoke all on function public.can_edit_resources() from public, anon, authenticated;
grant execute on function public.can_edit_resources() to authenticated;

create or replace function resource_private.list_editors(p_limit integer, p_offset integer)
returns table(user_id uuid, full_name text, email text, company_name text, is_super_admin boolean, can_edit boolean, granted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_super_admin_user() then
    raise exception 'resource_editors_forbidden' using errcode='42501';
  end if;
  if p_limit is null or p_limit not between 1 and 200 or p_offset is null or p_offset not between 0 and 1000000 then
    raise exception 'resource_editors_invalid';
  end if;
  return query select u.id, coalesce(p.full_name,''), coalesce(u.email::text,''), coalesce(c.name,''),
    coalesce(p.is_super_admin,false), (coalesce(p.is_super_admin,false) or e.user_id is not null), e.granted_at
  from auth.users u left join public.profiles p on p.id=u.id
    left join public.companies c on c.id=p.company_id
    left join public.resource_editors e on e.user_id=u.id
  order by u.id limit p_limit offset p_offset;
end;
$$;
create or replace function resource_private.set_editor(p_user_id uuid, p_can_edit boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_super_admin_user() then
    raise exception 'resource_editors_forbidden' using errcode='42501';
  end if;
  if p_user_id is null or p_can_edit is null then raise exception 'resource_editors_invalid'; end if;
  perform 1 from auth.users where id=p_user_id for update;
  if not found then raise exception 'resource_editor_missing'; end if;
  if exists(select 1 from public.profiles p where p.id=p_user_id and p.is_super_admin) then
    if not p_can_edit then raise exception 'resource_editor_superadmin'; end if;
    return true;
  end if;
  if p_can_edit then
    insert into public.resource_editors(user_id,granted_by) values(p_user_id,auth.uid()) on conflict(user_id) do nothing;
  else delete from public.resource_editors where user_id=p_user_id;
  end if;
  return true;
end;
$$;
create or replace function public.admin_list_resource_editors(p_limit integer default 200, p_offset integer default 0)
returns table(user_id uuid, full_name text, email text, company_name text, is_super_admin boolean, can_edit boolean, granted_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from resource_private.list_editors(p_limit,p_offset);
$$;
create or replace function public.admin_set_resource_editor(p_user_id uuid, p_can_edit boolean)
returns boolean language sql security invoker set search_path = '' as $$
  select resource_private.set_editor(p_user_id,p_can_edit);
$$;
revoke all on function resource_private.list_editors(integer,integer), resource_private.set_editor(uuid,boolean) from public, anon, authenticated;
grant execute on function resource_private.list_editors(integer,integer), resource_private.set_editor(uuid,boolean) to authenticated;
revoke all on function public.admin_list_resource_editors(integer,integer), public.admin_set_resource_editor(uuid,boolean) from public, anon, authenticated;
grant execute on function public.admin_list_resource_editors(integer,integer), public.admin_set_resource_editor(uuid,boolean) to authenticated;

alter table public.resource_pages add column if not exists archived_at timestamptz;

create or replace function resource_private.mutate_page(p_id uuid, p_document jsonb, p_expected_revision integer, p_action text, p_revision_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_page public.resource_pages; doc jsonb; assets uuid[]; result public.resource_pages;
begin
  if auth.uid() is null or not resource_private.can_edit() then raise exception 'resource_forbidden' using errcode='42501'; end if;
  if p_id is null or p_action is null or p_action not in ('save','publish','unpublish','restore','archive','unarchive') then raise exception 'resource_invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 901));
  select * into current_page from public.resource_pages where id = p_id for update;
  if (current_page.id is null and p_expected_revision is not null) or
     (current_page.id is not null and p_expected_revision is distinct from current_page.revision) then
    raise exception 'resource_conflict' using errcode='40001';
  end if;
  if p_action in ('restore','unpublish','archive','unarchive') and current_page.id is null then raise exception 'resource_missing'; end if;
  if p_action in ('archive','unarchive') then
    if p_action='archive' and current_page.archived_at is not null then raise exception 'resource_archived'; end if;
    if p_action='unarchive' and current_page.archived_at is null then raise exception 'resource_not_archived'; end if;
    -- Both operations produce a draft-only page. No attachment or history is deleted.
    delete from public.resource_publications where id=p_id;
    update public.resource_pages set archived_at=case when p_action='archive' then now() else null end,
      published_at=null, revision=revision+1, updated_at=now() where id=p_id returning * into result;
    insert into public.resource_revisions(page_id,revision,document,created_by)
      values(p_id,result.revision,result.draft,auth.uid());
    return to_jsonb(result) - 'created_by' - 'slug';
  end if;
  if current_page.archived_at is not null then raise exception 'resource_archived'; end if;
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

-- Archive blocks new attachments as well as saves, even via direct Storage/REST.
drop policy if exists resource_assets_insert on public.resource_assets;
create policy resource_assets_insert on public.resource_assets for insert to authenticated with check (
  (select resource_private.can_edit()) and exists (
    select 1 from public.resource_pages p where p.id=resource_assets.page_id and p.archived_at is null
  )
);
drop policy if exists resource_media_insert on storage.objects;
create policy resource_media_insert on storage.objects for insert to authenticated with check (
  bucket_id='resource-media' and (select resource_private.can_edit())
  and exists(select 1 from public.resource_pages p where p.id::text=split_part(storage.objects.name,'/',1) and p.archived_at is null)
);
commit;
