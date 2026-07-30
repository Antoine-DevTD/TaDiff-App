alter table public.companies
  add column if not exists logo_scale integer not null default 100,
  add column if not exists logo_position_x integer not null default 50,
  add column if not exists logo_position_y integer not null default 50;

alter table public.companies
  drop constraint if exists companies_logo_scale_check,
  add constraint companies_logo_scale_check check (logo_scale between 100 and 200),
  drop constraint if exists companies_logo_position_x_check,
  add constraint companies_logo_position_x_check check (logo_position_x between 0 and 100),
  drop constraint if exists companies_logo_position_y_check,
  add constraint companies_logo_position_y_check check (logo_position_y between 0 and 100);
