-- 018 - Retours et signalements (console admin Phase B)
--
-- Objectif : un canal de support simple pour la beta. Chaque compagnie peut
-- envoyer un retour (bug, idee, avis) depuis l'application ; les super admins
-- les trient et repondent depuis la console interne.
--
-- Ecriture via submit_feedback (security definer) : resout la compagnie et le
-- nom de l'auteur depuis le profil courant, comme log_activity (migration 012).
-- Lecture par les membres de leur compagnie (RLS) ; lecture globale et
-- changement de statut reserves aux super admins (RPC).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid,
  actor_name text not null default 'Utilisateur',
  page text,
  kind text not null default 'bug'
    check (kind in ('bug', 'idee', 'avis')),
  message text not null,
  status text not null default 'nouveau'
    check (status in ('nouveau', 'en_cours', 'traite')),
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_company_created_idx
  on public.feedback(company_id, created_at desc);
create index if not exists feedback_status_idx on public.feedback(status);

alter table public.feedback enable row level security;

-- Les membres lisent les retours de leur compagnie (statut + reponse admin).
drop policy if exists "members can read own feedback" on public.feedback;
create policy "members can read own feedback"
  on public.feedback for select
  using (public.is_company_member(company_id));

-- Envoi d'un retour depuis l'application.
create or replace function public.submit_feedback(
  feedback_kind text,
  feedback_message text,
  feedback_page text default null
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
    raise exception 'Aucune compagnie associee.';
  end if;

  if feedback_kind not in ('bug', 'idee', 'avis') then
    raise exception 'Type de retour invalide : %', feedback_kind;
  end if;

  if length(coalesce(feedback_message, '')) < 3 then
    raise exception 'Le message est trop court.';
  end if;

  insert into public.feedback(company_id, actor_id, actor_name, page, kind, message)
  values (
    current_profile.company_id,
    current_profile.id,
    current_profile.full_name,
    left(feedback_page, 120),
    feedback_kind,
    left(feedback_message, 2000)
  );
end;
$$;

-- Console admin : liste globale des retours avec le nom de la compagnie.
create or replace function public.admin_list_feedback()
returns table (
  id uuid,
  company_id uuid,
  company_name text,
  actor_name text,
  page text,
  kind text,
  message text,
  status text,
  admin_response text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.company_id,
    c.name,
    f.actor_name,
    f.page,
    f.kind,
    f.message,
    f.status,
    f.admin_response,
    f.created_at
  from public.feedback f
  join public.companies c on c.id = f.company_id
  where public.is_super_admin_user()
  order by
    case f.status when 'nouveau' then 0 when 'en_cours' then 1 else 2 end,
    f.created_at desc;
$$;

-- Changement de statut + reponse (super admin uniquement).
create or replace function public.admin_set_feedback_status(
  target_feedback_id uuid,
  new_status text,
  new_response text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin_user() then
    raise exception 'Acces reserve aux super admins.';
  end if;

  if new_status not in ('nouveau', 'en_cours', 'traite') then
    raise exception 'Statut invalide : %', new_status;
  end if;

  update public.feedback
  set status = new_status,
      admin_response = nullif(new_response, ''),
      updated_at = now()
  where id = target_feedback_id;

  if not found then
    raise exception 'Retour introuvable.';
  end if;
end;
$$;

grant execute on function public.submit_feedback(text, text, text) to authenticated;
grant execute on function public.admin_list_feedback() to authenticated;
grant execute on function public.admin_set_feedback_status(uuid, text, text) to authenticated;
