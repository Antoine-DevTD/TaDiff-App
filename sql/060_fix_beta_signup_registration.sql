-- 060 - Fiabilise l'inscription beta et indique si la demande vient d'etre creee.

drop function if exists public.register_beta_signup(text, text, text, text, text, text, text);

create function public.register_beta_signup(
  signup_company_name text,
  signup_contact_name text,
  signup_email text,
  signup_phone text,
  signup_city text,
  signup_discipline text,
  signup_main_need text
)
returns table(status text, "position" integer, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(signup_email));
  next_position integer;
  next_status text;
begin
  return query
    select b.status, b."position", false
    from public.beta_signups as b
    where lower(b.email) = normalized_email
    limit 1;

  if found then
    return;
  end if;

  select coalesce(max(b."position"), 0) + 1
    into next_position
    from public.beta_signups as b
    where not b.is_demo;

  next_status := case when next_position <= 30 then 'reserved' else 'waitlist' end;

  insert into public.beta_signups (
    company_name,
    contact_name,
    email,
    phone,
    city,
    discipline,
    main_need,
    status,
    "position",
    is_demo
  )
  values (
    trim(signup_company_name),
    trim(signup_contact_name),
    normalized_email,
    nullif(trim(signup_phone), ''),
    nullif(trim(signup_city), ''),
    trim(signup_discipline),
    trim(signup_main_need),
    next_status,
    next_position,
    false
  );

  status := next_status;
  "position" := next_position;
  is_new := true;
  return next;
end;
$$;

revoke all on function public.register_beta_signup(text, text, text, text, text, text, text)
  from public;

grant execute on function public.register_beta_signup(text, text, text, text, text, text, text)
  to anon, authenticated;
