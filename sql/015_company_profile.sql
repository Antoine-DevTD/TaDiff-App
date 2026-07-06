-- 015 - Profil compagnie editable
--
-- Objectifs :
-- 1. Ajouter les colonnes de profil d'une compagnie (coordonnees, identite
--    administrative, logo) reutilisables dans les devis et les dossiers.
-- 2. Autoriser leur modification depuis le client UNIQUEMENT pour owner/admin
--    (la policy "admins can update company" de la 009 s'applique deja ;
--    on etend seulement les privileges colonne, name restant deja accorde).
--
-- Rappel 009 : `revoke update on companies` + `grant update (name)`. On ajoute
-- ici les nouvelles colonnes a la liste des colonnes modifiables. Les colonnes
-- billing_* / plan_code / comped_until restent NON modifiables cote client.

alter table public.companies
  add column if not exists city text,
  add column if not exists discipline text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists siret text,
  add column if not exists license_number text,
  add column if not exists logo_url text,
  add column if not exists description text;

grant update (
  name,
  city,
  discipline,
  email,
  phone,
  website,
  siret,
  license_number,
  logo_url,
  description
) on public.companies to authenticated;
