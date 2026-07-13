alter table public.opportunities
  add column if not exists probability integer not null default 20;

alter table public.opportunities
  drop constraint if exists opportunities_probability_check;

alter table public.opportunities
  add constraint opportunities_probability_check
  check (probability >= 0 and probability <= 100);

notify pgrst, 'reload schema';
