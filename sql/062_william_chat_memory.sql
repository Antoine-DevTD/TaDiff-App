-- 062 - Memoire de conversation de l'assistant William

create table if not exists public.william_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.william_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.william_chat_sessions(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists william_chat_one_active_session_idx
  on public.william_chat_sessions(company_id, user_id)
  where status = 'active';

create index if not exists william_chat_sessions_user_updated_idx
  on public.william_chat_sessions(company_id, user_id, updated_at desc);

create index if not exists william_chat_messages_session_created_idx
  on public.william_chat_messages(session_id, created_at);

alter table public.william_chat_sessions enable row level security;
alter table public.william_chat_messages enable row level security;

drop policy if exists "users read their William chat sessions" on public.william_chat_sessions;
create policy "users read their William chat sessions"
  on public.william_chat_sessions for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_company_member(company_id)
  );

drop policy if exists "users create their William chat sessions" on public.william_chat_sessions;
create policy "users create their William chat sessions"
  on public.william_chat_sessions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_company_member(company_id)
  );

drop policy if exists "users update their William chat sessions" on public.william_chat_sessions;
create policy "users update their William chat sessions"
  on public.william_chat_sessions for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_company_member(company_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.is_company_member(company_id)
  );

drop policy if exists "users read their William chat messages" on public.william_chat_messages;
create policy "users read their William chat messages"
  on public.william_chat_messages for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_company_member(company_id)
    and exists (
      select 1
      from public.william_chat_sessions session
      where session.id = william_chat_messages.session_id
        and session.company_id = william_chat_messages.company_id
        and session.user_id = (select auth.uid())
    )
  );

drop policy if exists "users create their William chat messages" on public.william_chat_messages;
create policy "users create their William chat messages"
  on public.william_chat_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_company_member(company_id)
    and exists (
      select 1
      from public.william_chat_sessions session
      where session.id = william_chat_messages.session_id
        and session.company_id = william_chat_messages.company_id
        and session.user_id = (select auth.uid())
        and session.status = 'active'
    )
  );

grant select, insert, update on public.william_chat_sessions to authenticated;
grant select, insert on public.william_chat_messages to authenticated;

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

revoke all on function public.reset_webinar_demo_workspace() from public;
revoke all on function public.reset_webinar_demo_workspace() from anon;
grant execute on function public.reset_webinar_demo_workspace() to authenticated;
