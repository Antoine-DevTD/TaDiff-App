-- 047 - Bibliotheque de ressources metier, administree par la plateforme.
create table if not exists public.platform_resources (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  category text not null default 'General', url text not null, active boolean not null default true,
  sort_order integer not null default 0, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_resources enable row level security;
create policy "members read active platform resources" on public.platform_resources for select to authenticated
using (active or public.has_platform_permission('manage_catalogs'));
create policy "catalog admins manage platform resources" on public.platform_resources for all to authenticated
using (public.has_platform_permission('manage_catalogs')) with check (public.has_platform_permission('manage_catalogs'));
grant select, insert, update, delete on public.platform_resources to authenticated;
insert into public.platform_resources(title, description, category, url, sort_order) values
  ('ARTCENA', 'Centre national des arts du cirque, de la rue et du theatre.', 'Metier', 'https://www.artcena.fr/', 10),
  ('CulturePay', 'Ressources de paie et gestion sociale pour le spectacle vivant.', 'Administration', 'https://culturepay.fr/', 20),
  ('SACD', 'Demarches, droits et declarations des auteurs.', 'Droits', 'https://www.sacd.fr/', 30)
on conflict do nothing;
