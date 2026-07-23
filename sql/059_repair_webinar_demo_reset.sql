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
    description = null
  where id = target_company_id;

  perform public.seed_reference_grants(target_company_id);

  return target_company_id;
end;
$$;

revoke all on function public.reset_webinar_demo_workspace() from public;
revoke all on function public.reset_webinar_demo_workspace() from anon;
grant execute on function public.reset_webinar_demo_workspace() to authenticated;
