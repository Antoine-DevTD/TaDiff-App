-- 012 - Logs d'activite
--
-- Objectif : tracer les actions metier (creation, modification, suppression,
-- changement de statut) par compagnie, avec l'auteur. Demande par Tony
-- (section securite : "prevoir logs d'activite").
--
-- L'ecriture passe par la fonction log_activity (security definer) : elle
-- resout la compagnie et le nom de l'auteur depuis le profil courant, ce qui
-- empeche d'ecrire dans le journal d'une autre compagnie.

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid,
  actor_name text not null default 'Utilisateur',
  action text not null,
  entity_type text not null,
  entity_label text,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_company_created_idx
  on public.activity_logs(company_id, created_at desc);

alter table public.activity_logs enable row level security;

-- Lecture par les membres de la compagnie ; pas d'insert/update/delete direct
-- depuis le client (l'ecriture passe par la fonction ci-dessous).
drop policy if exists "members can read activity logs" on public.activity_logs;
create policy "members can read activity logs"
  on public.activity_logs for select
  using (public.is_company_member(company_id));

create or replace function public.log_activity(
  action_text text,
  entity_type_text text,
  entity_label_text text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile record;
begin
  select p.id, p.company_id, coalesce(p.full_name, 'Utilisateur') as full_name
    into current_profile
  from public.profiles p
  where p.id = auth.uid();

  if current_profile.company_id is null then
    return;
  end if;

  insert into public.activity_logs(company_id, actor_id, actor_name, action, entity_type, entity_label)
  values (
    current_profile.company_id,
    current_profile.id,
    current_profile.full_name,
    left(action_text, 80),
    left(entity_type_text, 40),
    left(entity_label_text, 200)
  );
end;
$$;

grant execute on function public.log_activity(text, text, text) to authenticated;
