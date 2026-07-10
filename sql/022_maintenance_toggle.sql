-- 022 - Bascule mode maintenance depuis la console admin
--
-- Objectif : activer/desactiver le mode maintenance depuis /admin, sans
-- dependre de la variable d'env TADIFF_MAINTENANCE_MODE (donc sans
-- redeploiement Vercel). Ligne unique, lue par tout visiteur (le flag lui
-- meme n'est pas une donnee sensible), modifiable uniquement via la RPC
-- security definer reservee aux super admins.
--
-- TADIFF_MAINTENANCE_MODE reste disponible comme bascule d'urgence : si elle
-- vaut true, le mode maintenance s'applique meme si ce flag DB est a false.

create table if not exists public.app_settings (
  id boolean primary key default true,
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id, maintenance_mode)
values (true, false)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Lecture publique : le proxy doit pouvoir lire le flag avant authentification
-- (un visiteur anonyme doit aussi voir la page de maintenance).
drop policy if exists "app settings are publicly readable" on public.app_settings;
create policy "app settings are publicly readable"
  on public.app_settings for select
  using (true);

create or replace function public.admin_set_maintenance_mode(enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin_user() then
    raise exception 'Acces reserve aux super admins.';
  end if;

  update public.app_settings
  set maintenance_mode = enabled,
      updated_at = now(),
      updated_by = auth.uid()
  where id = true;
end;
$$;

grant select on public.app_settings to anon, authenticated;
grant execute on function public.admin_set_maintenance_mode(boolean) to authenticated;
