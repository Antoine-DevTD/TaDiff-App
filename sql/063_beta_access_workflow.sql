-- 063 - Pilotage du parcours d'acces beta depuis la console interne

alter table public.beta_signups
  add column if not exists payment_email_sent_at timestamptz,
  add column if not exists payment_email_sent_by uuid references public.profiles(id) on delete set null,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists payment_reference text,
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists invitation_sent_by uuid references public.profiles(id) on delete set null,
  add column if not exists invited_user_id uuid,
  add column if not exists account_created_at timestamptz,
  add column if not exists last_access_error text;

create table if not exists public.beta_access_events (
  id uuid primary key default gen_random_uuid(),
  beta_signup_id uuid not null references public.beta_signups(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'payment_email_sent', 'payment_email_failed', 'payment_confirmed',
    'invitation_sent', 'invitation_failed', 'account_created'
  )),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists beta_access_events_signup_created_idx
  on public.beta_access_events(beta_signup_id, created_at desc);

alter table public.beta_access_events enable row level security;
revoke all on table public.beta_access_events from public, anon, authenticated;

drop function if exists public.admin_list_beta_signups();
create function public.admin_list_beta_signups()
returns table (
  id uuid, company_name text, contact_name text, email text, phone text, city text,
  discipline text, main_need text, status text, "position" integer, is_demo boolean,
  created_at timestamptz, payment_email_sent_at timestamptz,
  payment_confirmed_at timestamptz, payment_reference text,
  invitation_sent_at timestamptz, invited_user_id uuid,
  account_created_at timestamptz, last_access_error text
)
language sql stable security definer set search_path = public
as $$
  select b.id, b.company_name, b.contact_name, b.email, b.phone, b.city,
    b.discipline, b.main_need, b.status, b.position, b.is_demo, b.created_at,
    b.payment_email_sent_at, b.payment_confirmed_at, b.payment_reference,
    b.invitation_sent_at, b.invited_user_id, b.account_created_at,
    b.last_access_error
  from public.beta_signups b
  where public.has_platform_permission('view_beta')
  order by b.is_demo, b.status, b.position;
$$;
revoke all on function public.admin_list_beta_signups() from public, anon;
grant execute on function public.admin_list_beta_signups() to authenticated;
