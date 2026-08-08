-- 077 - Préférences de subventions par compagnie et propositions au catalogue.

alter table public.grant_opportunities
  add column if not exists catalog_id uuid references public.grant_catalog(id) on delete set null;

create index if not exists grant_opportunities_catalog_idx
  on public.grant_opportunities(catalog_id)
  where catalog_id is not null;

create table if not exists public.grant_catalog_exclusions (
  company_id uuid not null references public.companies(id) on delete cascade,
  catalog_id uuid not null references public.grant_catalog(id) on delete cascade,
  excluded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (company_id, catalog_id)
);

create table if not exists public.grant_catalog_proposals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid unique references public.grant_opportunities(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  funder text not null,
  territory text,
  discipline text,
  deadline date not null,
  amount numeric(12, 2) not null default 0,
  requirements text[] not null default '{}',
  themes text[] not null default '{}',
  source_url text,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'published', 'local_only', 'withdrawn')),
  promoted_catalog_id uuid references public.grant_catalog(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grant_catalog_proposals_status_created_idx
  on public.grant_catalog_proposals(review_status, created_at desc);

alter table public.grant_catalog_exclusions enable row level security;
alter table public.grant_catalog_proposals enable row level security;

revoke all on table public.grant_catalog_exclusions from public, anon, authenticated;
revoke all on table public.grant_catalog_proposals from public, anon, authenticated;

-- Identifier les aides déjà issues du catalogue avant d'activer les exclusions.
update public.grant_opportunities opportunity
set catalog_id = catalog.id
from public.grant_catalog catalog
where opportunity.catalog_id is null
  and lower(opportunity.title) = lower(catalog.title)
  and lower(opportunity.funder) = lower(catalog.funder);

create or replace function public.classify_grant_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.catalog_id is null then
    select catalog.id
      into new.catalog_id
    from public.grant_catalog catalog
    where catalog.active
      and lower(catalog.title) = lower(new.title)
      and lower(catalog.funder) = lower(new.funder)
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.propose_company_grant_for_catalog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.catalog_id is null then
    insert into public.grant_catalog_proposals (
      opportunity_id,
      company_id,
      title,
      funder,
      territory,
      discipline,
      deadline,
      amount,
      requirements,
      themes,
      source_url
    ) values (
      new.id,
      new.company_id,
      new.title,
      new.funder,
      new.territory,
      new.discipline,
      new.deadline,
      new.amount,
      coalesce(new.requirements, '{}'::text[]),
      coalesce(new.themes, '{}'::text[]),
      new.source_url
    )
    on conflict (opportunity_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.remember_removed_company_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return old;
  end if;

  if current_setting('tadiff.resetting_workspace', true) = 'on' then
    return old;
  end if;

  if old.catalog_id is not null then
    insert into public.grant_catalog_exclusions (
      company_id,
      catalog_id,
      excluded_by
    ) values (
      old.company_id,
      old.catalog_id,
      auth.uid()
    )
    on conflict (company_id, catalog_id) do nothing;
  else
    update public.grant_catalog_proposals
    set review_status = 'withdrawn',
        updated_at = now()
    where opportunity_id = old.id
      and review_status = 'pending';
  end if;

  return old;
end;
$$;

drop trigger if exists grant_opportunity_classify on public.grant_opportunities;
create trigger grant_opportunity_classify
before insert on public.grant_opportunities
for each row execute function public.classify_grant_opportunity();

drop trigger if exists grant_opportunity_catalog_proposal on public.grant_opportunities;
create trigger grant_opportunity_catalog_proposal
after insert on public.grant_opportunities
for each row execute function public.propose_company_grant_for_catalog();

drop trigger if exists grant_opportunity_remember_removal on public.grant_opportunities;
create trigger grant_opportunity_remember_removal
before delete on public.grant_opportunities
for each row execute function public.remember_removed_company_grant();

create or replace function public.seed_reference_grants(target_company_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if target_company_id is null then
    return 0;
  end if;

  insert into public.grant_opportunities (
    company_id,
    catalog_id,
    title,
    funder,
    territory,
    discipline,
    deadline,
    amount,
    status,
    requirements,
    eligibility,
    source_url,
    themes
  )
  select
    target_company_id,
    catalog.id,
    catalog.title,
    catalog.funder,
    coalesce(catalog.territory, ''),
    coalesce(catalog.discipline, ''),
    catalog.deadline,
    catalog.amount_max,
    'A surveiller',
    catalog.requirements,
    coalesce(catalog.eligibility, ''),
    coalesce(catalog.source_url, ''),
    catalog.themes
  from public.grant_catalog catalog
  where catalog.active
    and catalog.deadline is not null
    and not exists (
      select 1
      from public.grant_catalog_exclusions exclusion
      where exclusion.company_id = target_company_id
        and exclusion.catalog_id = catalog.id
    )
    and not exists (
      select 1
      from public.grant_opportunities existing
      where existing.company_id = target_company_id
        and (
          existing.catalog_id = catalog.id
          or (
            lower(existing.title) = lower(catalog.title)
            and lower(existing.funder) = lower(catalog.funder)
          )
        )
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.admin_list_grant_catalog_proposals()
returns table (
  id uuid,
  company_id uuid,
  company_name text,
  title text,
  funder text,
  territory text,
  discipline text,
  deadline date,
  amount numeric,
  requirements text[],
  themes text[],
  source_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    proposal.id,
    proposal.company_id,
    company.name,
    proposal.title,
    proposal.funder,
    proposal.territory,
    proposal.discipline,
    proposal.deadline,
    proposal.amount,
    proposal.requirements,
    proposal.themes,
    proposal.source_url,
    proposal.created_at
  from public.grant_catalog_proposals proposal
  join public.companies company on company.id = proposal.company_id
  where public.is_super_admin_user()
    and proposal.review_status = 'pending'
  order by proposal.created_at desc;
$$;

create or replace function public.admin_review_grant_catalog_proposal(
  target_proposal_id uuid,
  publish_globally boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal public.grant_catalog_proposals%rowtype;
  catalog_item_id uuid;
  company record;
begin
  if not public.is_super_admin_user() then
    raise exception 'Accès réservé au superadmin.';
  end if;

  select *
    into proposal
  from public.grant_catalog_proposals
  where id = target_proposal_id
    and review_status = 'pending'
  for update;

  if proposal.id is null then
    raise exception 'Proposition introuvable ou déjà traitée.';
  end if;

  if not publish_globally then
    update public.grant_catalog_proposals
    set review_status = 'local_only',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    where id = proposal.id;
    return null;
  end if;

  insert into public.grant_catalog (
    title,
    funder,
    territory,
    discipline,
    deadline,
    amount_max,
    requirements,
    themes,
    source_url,
    active
  ) values (
    proposal.title,
    proposal.funder,
    proposal.territory,
    proposal.discipline,
    proposal.deadline,
    proposal.amount,
    proposal.requirements,
    proposal.themes,
    proposal.source_url,
    true
  )
  on conflict (lower(title), lower(funder)) do update
  set territory = excluded.territory,
      discipline = excluded.discipline,
      deadline = excluded.deadline,
      amount_max = excluded.amount_max,
      requirements = excluded.requirements,
      themes = excluded.themes,
      source_url = excluded.source_url,
      active = true,
      updated_at = now()
  returning id into catalog_item_id;

  -- Une compagnie qui avait supprimé cette aide locale ne doit pas la voir
  -- revenir si une autre compagnie la fait ensuite publier globalement.
  insert into public.grant_catalog_exclusions (
    company_id,
    catalog_id,
    excluded_by
  )
  select distinct
    withdrawn.company_id,
    catalog_item_id,
    null
  from public.grant_catalog_proposals withdrawn
  where withdrawn.review_status = 'withdrawn'
    and lower(withdrawn.title) = lower(proposal.title)
    and lower(withdrawn.funder) = lower(proposal.funder)
  on conflict (company_id, catalog_id) do nothing;

  update public.grant_opportunities opportunity
  set catalog_id = catalog_item_id
  where lower(opportunity.title) = lower(proposal.title)
    and lower(opportunity.funder) = lower(proposal.funder)
    and not exists (
      select 1
      from public.grant_catalog_exclusions exclusion
      where exclusion.company_id = opportunity.company_id
        and exclusion.catalog_id = catalog_item_id
    );

  update public.grant_catalog_proposals
  set review_status = 'published',
      promoted_catalog_id = catalog_item_id,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where review_status = 'pending'
    and lower(title) = lower(proposal.title)
    and lower(funder) = lower(proposal.funder);

  for company in select id from public.companies loop
    perform public.seed_reference_grants(company.id);
  end loop;

  return catalog_item_id;
end;
$$;

create or replace function public.reset_webinar_demo_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_company_id uuid;
  table_name text;
begin
  if current_user_id is null or current_email <> 'demo_webinaire@yopmail.com' then
    raise exception 'Webinar demo account required';
  end if;

  select profiles.company_id
    into target_company_id
  from public.profiles
  where profiles.id = current_user_id;

  if target_company_id is null then
    raise exception 'Webinar demo workspace not found';
  end if;

  if exists (
    select 1
    from public.profiles
    where profiles.company_id = target_company_id
      and profiles.id <> current_user_id
  ) then
    raise exception 'The webinar demo workspace contains other members';
  end if;

  perform set_config('tadiff.resetting_workspace', 'on', true);

  foreach table_name in array array[
    'william_chat_messages',
    'william_chat_sessions',
    'william_messages',
    'william_conversations',
    'william_question_events',
    'reminder_events',
    'performance_invitations',
    'exploitation_performances',
    'exploitations',
    'show_work_document_versions',
    'show_work_documents',
    'show_work_folders',
    'show_budget_items',
    'show_budget_profiles',
    'show_documents',
    'show_cost_profiles',
    'quotes',
    'reminders',
    'opportunities',
    'contacts',
    'shows',
    'calendar_events',
    'company_documents',
    'fixed_costs',
    'treasury_snapshots',
    'patronage_deals',
    'commercial_packs',
    'email_campaigns',
    'email_templates',
    'grant_catalog_proposals',
    'grant_catalog_exclusions',
    'grant_opportunities',
    'rag_documents',
    'ai_usage_events',
    'ai_token_reservations',
    'activity_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('delete from public.%I where company_id = $1', table_name)
      using target_company_id;
    end if;
  end loop;

  update public.companies
  set
    name = 'Ma compagnie',
    city = null,
    discipline = null,
    email = null,
    phone = null,
    website = null,
    siret = null,
    license_number = null,
    logo_url = null,
    logo_scale = 100,
    logo_position_x = 50,
    logo_position_y = 50,
    description = null
  where id = target_company_id;

  perform public.seed_reference_grants(target_company_id);

  return target_company_id;
end;
$$;

revoke all on function public.classify_grant_opportunity() from public;
revoke all on function public.propose_company_grant_for_catalog() from public;
revoke all on function public.remember_removed_company_grant() from public;
revoke all on function public.admin_list_grant_catalog_proposals() from public, anon;
revoke all on function public.admin_review_grant_catalog_proposal(uuid, boolean) from public, anon;
grant execute on function public.admin_list_grant_catalog_proposals() to authenticated;
grant execute on function public.admin_review_grant_catalog_proposal(uuid, boolean) to authenticated;
revoke all on function public.reset_webinar_demo_workspace() from public, anon;
grant execute on function public.reset_webinar_demo_workspace() to authenticated;

notify pgrst, 'reload schema';
