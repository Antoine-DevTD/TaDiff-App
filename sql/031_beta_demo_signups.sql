-- 031 - Donnees beta de demonstration, strictement exclues des compteurs publics.

alter table public.beta_signups
  add column if not exists is_demo boolean not null default false;

create index if not exists beta_signups_is_demo_idx
  on public.beta_signups(is_demo, status);

insert into public.beta_signups (
  company_name,
  contact_name,
  email,
  city,
  discipline,
  main_need,
  status,
  "position",
  is_demo
)
values
  ('Compagnie du Passage', 'Camille Bernard', 'demo.beta.1@tadiff.com', 'Nantes', 'Theatre', 'Structurer la diffusion', 'reserved', 100001, true),
  ('Collectif Lisiere', 'Nora Martin', 'demo.beta.2@tadiff.com', 'Rennes', 'Theatre contemporain', 'Suivre les programmateurs', 'reserved', 100002, true),
  ('La Scene Mobile', 'Julien Moreau', 'demo.beta.3@tadiff.com', 'Angers', 'Arts de la rue', 'Centraliser les dossiers', 'reserved', 100003, true),
  ('Compagnie Clair-Obscur', 'Sarah Petit', 'demo.beta.4@tadiff.com', 'Tours', 'Danse', 'Anticiper la tresorerie', 'reserved', 100004, true),
  ('Les Echappees', 'Mehdi Laurent', 'demo.beta.5@tadiff.com', 'Poitiers', 'Jeune public', 'Trouver des subventions', 'reserved', 100005, true)
on conflict do nothing;

create or replace function public.register_beta_signup(
  signup_company_name text,
  signup_contact_name text,
  signup_email text,
  signup_phone text,
  signup_city text,
  signup_discipline text,
  signup_main_need text
)
returns table(status text, "position" integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(signup_email));
  next_position integer;
  next_status text;
begin
  return query
    select beta_signups.status, beta_signups."position"
    from public.beta_signups
    where lower(beta_signups.email) = normalized_email
    limit 1;

  if found then
    return;
  end if;

  select coalesce(max("position"), 0) + 1
    into next_position
    from public.beta_signups
    where not is_demo;

  next_status := case when next_position <= 30 then 'reserved' else 'waitlist' end;

  insert into public.beta_signups (
    company_name, contact_name, email, phone, city, discipline, main_need,
    status, "position", is_demo
  )
  values (
    trim(signup_company_name), trim(signup_contact_name), normalized_email,
    nullif(trim(signup_phone), ''), nullif(trim(signup_city), ''),
    trim(signup_discipline), trim(signup_main_need), next_status, next_position, false
  );

  status := next_status;
  "position" := next_position;
  return next;
end;
$$;

create or replace function public.get_beta_signup_stats()
returns table(reserved_count integer, waitlist_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where status = 'reserved' and not is_demo)::integer,
    count(*) filter (where status = 'waitlist' and not is_demo)::integer
  from public.beta_signups;
$$;

drop function if exists public.admin_list_beta_signups();
create function public.admin_list_beta_signups()
returns table (
  id uuid,
  company_name text,
  contact_name text,
  email text,
  phone text,
  city text,
  discipline text,
  main_need text,
  status text,
  "position" integer,
  is_demo boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id, b.company_name, b.contact_name, b.email, b.phone, b.city,
    b.discipline, b.main_need, b.status, b.position, b.is_demo, b.created_at
  from public.beta_signups b
  where public.is_super_admin_user()
  order by b.is_demo, b.status, b.position;
$$;

grant execute on function public.admin_list_beta_signups() to authenticated;
