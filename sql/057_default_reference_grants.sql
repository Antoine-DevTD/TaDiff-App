create or replace function public.seed_reference_grants(target_company_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if target_company_id is null then
    return 0;
  end if;

  insert into public.grant_opportunities (
    company_id,
    title,
    funder,
    territory,
    discipline,
    deadline,
    amount,
    status,
    requirements,
    eligibility,
    source_url,
    themes
  )
  select
    target_company_id,
    reference.title,
    reference.funder,
    reference.territory,
    reference.discipline,
    reference.deadline,
    reference.amount,
    'A surveiller',
    reference.requirements,
    reference.eligibility,
    reference.source_url,
    reference.themes
  from (
    values
      (
        'Aide a la production et a la diffusion - session d''aout',
        'CNM',
        'France',
        'Spectacle vivant musical',
        date '2026-08-26',
        15000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts', 'Fiche technique']::text[],
        'Date limite verifiee (26 aout 2026). Prevoir 8 semaines d''analyse et une affiliation CNM a anticiper d''au moins 20 jours ouvres.',
        'https://cnm.fr/aides-financieres/aide-a-la-production-et-a-la-diffusion-de-spectacle-vivant/',
        array['Production', 'Diffusion', 'Musique']::text[]
      ),
      (
        'Aide a la production et a la diffusion - session d''octobre',
        'CNM',
        'France',
        'Spectacle vivant musical',
        date '2026-10-07',
        15000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts', 'Fiche technique']::text[],
        'Date limite verifiee (7 octobre 2026). Memes conditions que la session d''aout : affiliation et delais d''instruction a anticiper.',
        'https://cnm.fr/aides-financieres/aide-a-la-production-et-a-la-diffusion-de-spectacle-vivant/',
        array['Production', 'Diffusion', 'Musique']::text[]
      ),
      (
        'Aide au projet spectacle vivant',
        'DRAC (Ministere de la Culture)',
        'Region de la compagnie',
        'Toutes disciplines',
        date '2026-09-30',
        10000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts', 'Synopsis']::text[],
        'Date indicative : chaque DRAC publie son propre calendrier, a verifier aupres de votre region.',
        'https://www.culture.gouv.fr/catalogue-des-demarches-et-subventions/subvention/aide-au-projet-ou-au-fonctionnement-spectacle-vivant-et-arts-visuels',
        array['Creation', 'Fonctionnement', 'DRAC']::text[]
      ),
      (
        'Aides aux structures employant des artistes',
        'Adami',
        'France',
        'Artistes-interpretes',
        date '2026-09-15',
        20000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts']::text[],
        'Plafond mentionne de 20 000 EUR selon dispositif, aide simplifiee possible. Date indicative : verifier le calendrier des commissions.',
        'https://www.adami.fr/suis-porteurde-projet/les-aides/',
        array['Emploi artistique', 'Production']::text[]
      ),
      (
        'Aide aux projets artistiques',
        'SPEDIDAM',
        'France',
        'Artistes-interpretes',
        date '2026-09-01',
        8000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts', 'Fiche technique']::text[],
        'Date indicative : les depots suivent le calendrier des commissions SPEDIDAM, a verifier sur leur page officielle.',
        'https://www.spedidam.fr/aides-aux-projets/calendrier-des-commissions/',
        array['Creation', 'Diffusion', 'Emploi']::text[]
      ),
      (
        'Aide a la création de textes dramatiques',
        'SACD - Beaumarchais',
        'France',
        'Theatre, ecriture',
        date '2026-09-15',
        5000::numeric,
        array['Texte', 'Note d''intention', 'Dossier artistique', 'RIB']::text[],
        'Date indicative : l''association Beaumarchais-SACD fonctionne par sessions, calendrier a verifier.',
        'https://beaumarchais.asso.fr/',
        array['Ecriture', 'Creation', 'Theatre']::text[]
      ),
      (
        'Aide a la diffusion regionale',
        'Conseil regional',
        'Region de la compagnie',
        'Toutes disciplines',
        date '2026-10-15',
        6000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts', 'Devis']::text[],
        'Date indicative : chaque region a son propre dispositif et calendrier (guichet unique regional a identifier).',
        'https://www.culture.gouv.fr/Aides-demarches',
        array['Diffusion', 'Territoire']::text[]
      ),
      (
        'Subvention culture de la ville',
        'Ville / intercommunalite',
        'Commune de la compagnie',
        'Toutes disciplines',
        date '2026-11-30',
        3000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts']::text[],
        'Date indicative : la plupart des villes ouvrent leur campagne de subventions culture a l''automne pour l''annee suivante.',
        'https://www.service-public.fr/associations/vosdroits/F3180',
        array['Fonctionnement', 'Territoire']::text[]
      ),
      (
        'Aide a la mobilite internationale',
        'Institut francais',
        'International',
        'Toutes disciplines',
        date '2026-10-01',
        7000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts', 'Fiche technique']::text[],
        'Date indicative : les appels varient selon les programmes (tournees, residences, saisons croisees), a verifier par programme.',
        'https://www.institutfrancais.com/fr/offres',
        array['International', 'Tournee']::text[]
      ),
      (
        'Europe Creative - volet Culture',
        'Commission europeenne',
        'Europe',
        'Toutes disciplines',
        date '2026-12-15',
        30000::numeric,
        array['Dossier artistique', 'Note d''intention', 'Budget', 'RIB', 'Statuts', 'Fiche technique']::text[],
        'Date indicative : appels annuels avec partenariat europeen requis. Dossier exigeant, a anticiper plusieurs mois.',
        'https://culture.ec.europa.eu/fr/creative-europe',
        array['Europe', 'Cooperation']::text[]
      )
  ) as reference(
    title,
    funder,
    territory,
    discipline,
    deadline,
    amount,
    requirements,
    eligibility,
    source_url,
    themes
  )
  where not exists (
    select 1
    from public.grant_opportunities existing
    where existing.company_id = target_company_id
      and existing.title = reference.title
      and existing.funder = reference.funder
  );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.seed_reference_grants(uuid) from public;
revoke all on function public.seed_reference_grants(uuid) from anon;
revoke all on function public.seed_reference_grants(uuid) from authenticated;

create or replace function public.ensure_workspace(company_name text default 'Ma compagnie')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_company_id uuid;
  created_company_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select profiles.company_id
    into existing_company_id
  from public.profiles
  where profiles.id = current_user_id;

  if existing_company_id is not null then
    perform public.seed_reference_grants(existing_company_id);
    return existing_company_id;
  end if;

  insert into public.companies(name)
  values (coalesce(nullif(company_name, ''), 'Ma compagnie'))
  returning id into created_company_id;

  insert into public.profiles(id, company_id, role, full_name)
  values (
    current_user_id,
    created_company_id,
    'owner',
    coalesce(auth.jwt() ->> 'email', 'Utilisateur')
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        role = coalesce(public.profiles.role, excluded.role),
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  perform public.seed_reference_grants(created_company_id);

  return created_company_id;
end;
$$;

revoke all on function public.ensure_workspace(text) from public;
revoke all on function public.ensure_workspace(text) from anon;
grant execute on function public.ensure_workspace(text) to authenticated;
