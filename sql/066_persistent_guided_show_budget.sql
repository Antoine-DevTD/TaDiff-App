-- 066 - Persistance du premier parametrage du budget detaille.

alter table public.show_budget_profiles
  add column if not exists setup_complete boolean not null default false;

comment on column public.show_budget_profiles.setup_complete is
  'Indique que le parcours guide des metiers et depenses a ete termine pour ce spectacle.';

grant select, insert, update on table public.show_budget_profiles to authenticated;
