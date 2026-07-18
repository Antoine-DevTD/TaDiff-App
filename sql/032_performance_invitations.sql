-- 032 - Invitations personnalisees a une representation et suivi des reponses.

create table if not exists public.performance_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  performance_opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  show_id uuid references public.shows(id) on delete set null,
  token uuid not null default gen_random_uuid() unique,
  recipient_name text not null,
  recipient_email text not null,
  subject text not null,
  performance_date date not null,
  venue text,
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  email_opened_at timestamptz,
  email_clicked_at timestamptz,
  bounced_at timestamptz,
  link_opened_at timestamptz,
  responded_at timestamptz,
  response text check (response in ('yes', 'no')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists performance_invitations_company_idx
  on public.performance_invitations(company_id, created_at desc);
create index if not exists performance_invitations_opportunity_idx
  on public.performance_invitations(opportunity_id, created_at desc);
create index if not exists performance_invitations_token_idx
  on public.performance_invitations(token);

alter table public.performance_invitations enable row level security;

drop policy if exists "members can manage performance invitations" on public.performance_invitations;
create policy "members can manage performance invitations"
  on public.performance_invitations for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

create or replace function public.get_public_performance_invitation(invitation_token uuid)
returns table (
  company_name text,
  show_title text,
  performance_date date,
  venue text,
  recipient_name text,
  response text,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.performance_invitations
  set link_opened_at = coalesce(link_opened_at, now()),
      updated_at = now()
  where token = invitation_token;

  return query
    select c.name, s.title, pi.performance_date, pi.venue,
      pi.recipient_name, pi.response, pi.responded_at
    from public.performance_invitations pi
    join public.companies c on c.id = pi.company_id
    left join public.shows s on s.id = pi.show_id
    where pi.token = invitation_token
    limit 1;
end;
$$;

create or replace function public.respond_to_performance_invitation(
  invitation_token uuid,
  invitation_response text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if invitation_response not in ('yes', 'no') then
    raise exception 'Reponse invalide.';
  end if;

  update public.performance_invitations
  set response = invitation_response,
      responded_at = now(),
      link_opened_at = coalesce(link_opened_at, now()),
      updated_at = now()
  where token = invitation_token;

  return found;
end;
$$;

grant execute on function public.get_public_performance_invitation(uuid) to anon, authenticated;
grant execute on function public.respond_to_performance_invitation(uuid, text) to anon, authenticated;
