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

  delete from public.william_messages where company_id = target_company_id;
  delete from public.william_conversations where company_id = target_company_id;
  delete from public.william_question_events where company_id = target_company_id;

  delete from public.reminder_events where company_id = target_company_id;
  delete from public.performance_invitations where company_id = target_company_id;
  delete from public.exploitation_performances where company_id = target_company_id;
  delete from public.exploitations where company_id = target_company_id;

  delete from public.show_work_document_versions where company_id = target_company_id;
  delete from public.show_work_documents where company_id = target_company_id;
  delete from public.show_work_folders where company_id = target_company_id;
  delete from public.show_budget_items where company_id = target_company_id;
  delete from public.show_budget_profiles where company_id = target_company_id;
  delete from public.show_documents where company_id = target_company_id;
  delete from public.show_cost_profiles where company_id = target_company_id;

  delete from public.quotes where company_id = target_company_id;
  delete from public.reminders where company_id = target_company_id;
  delete from public.opportunities where company_id = target_company_id;
  delete from public.contacts where company_id = target_company_id;
  delete from public.shows where company_id = target_company_id;

  delete from public.calendar_events where company_id = target_company_id;
  delete from public.company_documents where company_id = target_company_id;
  delete from public.fixed_costs where company_id = target_company_id;
  delete from public.treasury_snapshots where company_id = target_company_id;
  delete from public.patronage_deals where company_id = target_company_id;
  delete from public.commercial_packs where company_id = target_company_id;
  delete from public.email_campaigns where company_id = target_company_id;
  delete from public.email_templates where company_id = target_company_id;
  delete from public.grant_opportunities where company_id = target_company_id;
  delete from public.rag_documents where company_id = target_company_id;

  delete from public.ai_usage_events where company_id = target_company_id;
  delete from public.ai_token_reservations where company_id = target_company_id;
  delete from public.activity_logs where company_id = target_company_id;

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
