-- 029 - Retention RGPD des journaux d'acces
-- Les IP, user-agents et pages consultees sont supprimes apres 90 jours.

create or replace function public.purge_expired_access_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.role() <> 'service_role' and not public.is_super_admin_user() then
    raise exception 'Acces refuse';
  end if;

  delete from public.access_events
  where created_at < now() - interval '90 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_access_events() from public, anon;
grant execute on function public.purge_expired_access_events() to authenticated, service_role;

-- A planifier une fois par jour dans Supabase Cron (contexte postgres sans session utilisateur) :
-- delete from public.access_events where created_at < now() - interval '90 days';
-- delete from public.public_analytics_events where created_at < now() - interval '90 days';
