-- 073 - Supervision respectueuse des workflows compagnie
--
-- Cette RPC ne retourne aucun contenu métier : seulement des volumes, des
-- jalons d'usage et des dates d'activité agrégées. Elle reste la seule porte
-- de lecture globale et exige le droit plateforme view_companies.

create index if not exists grant_opportunities_company_idx
  on public.grant_opportunities(company_id);
create index if not exists william_question_events_company_created_idx
  on public.william_question_events(company_id, created_at desc);
create index if not exists show_work_documents_company_idx
  on public.show_work_documents(company_id);
create index if not exists exploitation_performances_company_idx
  on public.exploitation_performances(company_id);

create or replace function public.admin_list_company_workflow_metrics()
returns table (
  company_id uuid,
  company_name text,
  billing_status text,
  plan_code text,
  created_at timestamptz,
  member_count bigint,
  profile_field_count integer,
  show_count bigint,
  budget_setup_count bigint,
  contact_count bigint,
  venue_count bigint,
  opportunity_count bigint,
  exploitation_count bigint,
  performance_count bigint,
  reminder_count bigint,
  completed_reminder_count bigint,
  document_count bigint,
  calendar_event_count bigint,
  fixed_cost_count bigint,
  treasury_movement_count bigint,
  grant_count bigint,
  email_template_count bigint,
  william_request_count bigint,
  activity_7d_count bigint,
  activity_30d_count bigint,
  page_view_30d_count bigint,
  active_days_30d bigint,
  visited_sections text[],
  last_activity timestamptz,
  last_login timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    c.id,
    c.name,
    c.billing_status,
    c.plan_code,
    c.created_at,
    (select count(*) from public.profiles p where p.company_id = c.id),
    (
      (case when nullif(trim(c.city), '') is not null then 1 else 0 end) +
      (case when nullif(trim(c.discipline), '') is not null then 1 else 0 end) +
      (case when nullif(trim(c.email), '') is not null then 1 else 0 end) +
      (case when nullif(trim(c.phone), '') is not null then 1 else 0 end) +
      (case when nullif(trim(c.website), '') is not null then 1 else 0 end) +
      (case when nullif(trim(c.siret), '') is not null then 1 else 0 end) +
      (case when nullif(trim(c.license_number), '') is not null then 1 else 0 end) +
      (case when nullif(trim(c.logo_url), '') is not null then 1 else 0 end)
    )::integer,
    (select count(*) from public.shows s where s.company_id = c.id),
    (select count(*) from public.show_budget_profiles sbp where sbp.company_id = c.id and sbp.setup_complete),
    (select count(*) from public.contacts ct where ct.company_id = c.id),
    (select count(*) from public.contacts ct where ct.company_id = c.id and ct.contact_type = 'venue'),
    (select count(*) from public.opportunities o where o.company_id = c.id),
    (select count(*) from public.exploitations e where e.company_id = c.id),
    (select count(*) from public.exploitation_performances ep where ep.company_id = c.id),
    (select count(*) from public.reminders r where r.company_id = c.id),
    (select count(*) from public.reminders r where r.company_id = c.id and r.done),
    (
      (select count(*) from public.show_documents sd where sd.company_id = c.id and (sd.storage_path is not null or nullif(trim(sd.file_url), '') is not null)) +
      (select count(*) from public.company_documents cd where cd.company_id = c.id and (cd.storage_path is not null or nullif(trim(cd.file_url), '') is not null)) +
      (select count(*) from public.show_work_documents swd where swd.company_id = c.id)
    ),
    (select count(*) from public.calendar_events ce where ce.company_id = c.id),
    (select count(*) from public.fixed_costs fc where fc.company_id = c.id),
    (select count(*) from public.treasury_movements tm where tm.company_id = c.id),
    (select count(*) from public.grant_opportunities go where go.company_id = c.id and go.status <> 'A surveiller'),
    (select count(*) from public.email_templates et where et.company_id = c.id),
    (select count(*) from public.william_question_events wqe where wqe.company_id = c.id),
    (select count(*) from public.activity_logs al where al.company_id = c.id and al.created_at >= now() - interval '7 days'),
    (select count(*) from public.activity_logs al where al.company_id = c.id and al.created_at >= now() - interval '30 days'),
    (select count(*) from public.access_events ae where ae.company_id = c.id and ae.event_type = 'page_view' and ae.created_at >= now() - interval '30 days'),
    (select count(distinct ae.created_at::date) from public.access_events ae where ae.company_id = c.id and ae.event_type = 'page_view' and ae.created_at >= now() - interval '30 days'),
    coalesce((
      select array_agg(section order by section)
      from (
        select distinct case
          when ae.path = '/dashboard' or ae.path like '/reminders%' then 'Aujourd''hui et actions'
          when ae.path like '/shows%' then 'Spectacles'
          when ae.path like '/contacts%' then 'Contacts'
          when ae.path like '/pipeline%' then 'Diffusion'
          when ae.path like '/campaigns%' then 'Emails'
          when ae.path like '/calendar%' then 'Agenda'
          when ae.path like '/finances%' then 'Trésorerie'
          when ae.path like '/subventions%' or ae.path like '/mecenat%' or ae.path like '/contracts%' then 'Dossiers'
          else null
        end as section
        from public.access_events ae
        where ae.company_id = c.id
          and ae.event_type = 'page_view'
          and ae.created_at >= now() - interval '30 days'
      ) visited
      where section is not null
    ), '{}'::text[]),
    greatest(
      (select max(al.created_at) from public.activity_logs al where al.company_id = c.id),
      (select max(ae.created_at) from public.access_events ae where ae.company_id = c.id)
    ),
    (select max(ae.created_at) from public.access_events ae where ae.company_id = c.id and ae.event_type = 'login')
  from public.companies c
  where public.has_platform_permission('view_companies')
  order by greatest(
    (select max(al.created_at) from public.activity_logs al where al.company_id = c.id),
    c.created_at
  ) desc;
$$;

revoke all on function public.admin_list_company_workflow_metrics() from public, anon;
grant execute on function public.admin_list_company_workflow_metrics() to authenticated;
