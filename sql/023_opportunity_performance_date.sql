-- 023 - Date de jeu sur les dates de diffusion
--
-- Une "date possible" doit pouvoir porter la date factuelle de représentation,
-- distincte de la date de relance commerciale.

alter table public.opportunities
  add column if not exists performance_date date;

create index if not exists opportunities_performance_date_idx
  on public.opportunities(company_id, performance_date)
  where performance_date is not null;
