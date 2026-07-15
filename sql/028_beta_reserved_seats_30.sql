-- 028 - Passage de la beta de 10 a 30 places reservees.

update public.beta_signups
set status = 'reserved'
where "position" <= 30
  and status = 'waitlist';

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

  select count(*) + 1
    into next_position
    from public.beta_signups;

  if next_position <= 30 then
    next_status := 'reserved';
  else
    next_status := 'waitlist';
  end if;

  insert into public.beta_signups (
    company_name,
    contact_name,
    email,
    phone,
    city,
    discipline,
    main_need,
    status,
    "position"
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
    next_position
  );

  status := next_status;
  "position" := next_position;
  return next;
end;
$$;

grant execute on function public.register_beta_signup(text, text, text, text, text, text, text)
  to anon, authenticated;
