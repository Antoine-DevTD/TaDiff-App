-- 064 - Unifier le catalogue de subventions et rendre les variantes email administrables

delete from public.grant_catalog duplicate
using public.grant_catalog retained
where lower(duplicate.title) = lower(retained.title)
  and lower(duplicate.funder) = lower(retained.funder)
  and duplicate.id > retained.id;

create unique index if not exists grant_catalog_title_funder_uidx
  on public.grant_catalog (lower(title), lower(funder));

insert into public.grant_catalog (
  title, funder, territory, discipline, deadline, amount_max, eligibility,
  requirements, themes, source_url, active, last_verified_at
)
select distinct on (lower(opportunity.title), lower(opportunity.funder))
  opportunity.title,
  opportunity.funder,
  opportunity.territory,
  opportunity.discipline,
  opportunity.deadline,
  opportunity.amount,
  opportunity.eligibility,
  opportunity.requirements,
  opportunity.themes,
  opportunity.source_url,
  true,
  null
from public.grant_opportunities opportunity
where opportunity.source_url in (
  'https://cnm.fr/aides-financieres/aide-a-la-production-et-a-la-diffusion-de-spectacle-vivant/',
  'https://www.culture.gouv.fr/catalogue-des-demarches-et-subventions/subvention/aide-au-projet-ou-au-fonctionnement-spectacle-vivant-et-arts-visuels',
  'https://www.adami.fr/suis-porteurde-projet/les-aides/',
  'https://www.spedidam.fr/aides-aux-projets/calendrier-des-commissions/',
  'https://beaumarchais.asso.fr/',
  'https://www.culture.gouv.fr/Aides-demarches',
  'https://www.service-public.fr/associations/vosdroits/F3180',
  'https://www.institutfrancais.com/fr/offres',
  'https://culture.ec.europa.eu/fr/creative-europe'
)
on conflict (lower(title), lower(funder)) do nothing;

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
    company_id, title, funder, territory, discipline, deadline, amount, status,
    requirements, eligibility, source_url, themes
  )
  select
    target_company_id,
    catalog.title,
    catalog.funder,
    coalesce(catalog.territory, ''),
    coalesce(catalog.discipline, ''),
    catalog.deadline,
    catalog.amount_max,
    'A surveiller',
    catalog.requirements,
    coalesce(catalog.eligibility, ''),
    coalesce(catalog.source_url, ''),
    catalog.themes
  from public.grant_catalog catalog
  where catalog.active
    and catalog.deadline is not null
    and not exists (
      select 1
      from public.grant_opportunities existing
      where existing.company_id = target_company_id
        and lower(existing.title) = lower(catalog.title)
        and lower(existing.funder) = lower(catalog.funder)
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.seed_reference_grants(uuid) from public;
revoke all on function public.seed_reference_grants(uuid) from anon;
revoke all on function public.seed_reference_grants(uuid) from authenticated;

alter table public.platform_email_templates
  add column if not exists system_key text,
  add column if not exists attachment_template text not null default
    'Vous trouverez également en pièces jointes : @pieces_jointes.';

create unique index if not exists platform_email_templates_system_key_uidx
  on public.platform_email_templates(system_key)
  where system_key is not null;

insert into public.platform_email_templates (
  system_key, name, message_type, subject_template, body_json, attachment_template, active
)
values
  (
    'first-touch',
    'Première rencontre',
    'first-touch',
    '@titre_spectacle - proposition pour @structure',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Bonjour @prenom_contact,"}]},{"type":"paragraph","content":[{"type":"text","text":"Je me permets de vous contacter pour vous présenter @titre_spectacle."}]},{"type":"paragraph","content":[{"type":"text","text":"@logline","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"@synopsis"}]},{"type":"paragraph","content":[{"type":"text","text":"Le spectacle explore @thematiques."}]},{"type":"paragraph","content":[{"type":"text","text":"Il a été pensé pour @public."}]},{"type":"paragraph","content":[{"type":"text","text":"Je serais heureux d’échanger avec vous pour voir comment ce projet pourrait trouver sa place au sein de @structure."}]},{"type":"paragraph","content":[{"type":"text","text":"Bien à vous,"}]}]}'::jsonb,
    'Vous trouverez également en pièces jointes : @pieces_jointes.',
    true
  ),
  (
    'follow-up',
    'Relance',
    'follow-up',
    'Suite à notre échange - @titre_spectacle',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Bonjour @prenom_contact,"}]},{"type":"paragraph","content":[{"type":"text","text":"Je me permets de revenir vers vous au sujet de @titre_spectacle."}]},{"type":"paragraph","content":[{"type":"text","text":"@logline","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"@synopsis"}]},{"type":"paragraph","content":[{"type":"text","text":"Avez-vous eu l’occasion de regarder les éléments transmis ? Je reste disponible pour préciser la forme, les conditions d’accueil ou les prochaines disponibilités."}]},{"type":"paragraph","content":[{"type":"text","text":"Bien à vous,"}]}]}'::jsonb,
    'Je vous remets également les pièces utiles : @pieces_jointes.',
    true
  ),
  (
    'date-option',
    'Invitation à une représentation',
    'date-option',
    'Invitation - @titre_spectacle',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Bonjour @prenom_contact,"}]},{"type":"paragraph","content":[{"type":"text","text":"Je souhaitais vous inviter à découvrir @titre_spectacle lors de notre prochaine représentation."}]},{"type":"paragraph","content":[{"type":"text","text":"Prochaine date : @prochaine_date","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"@logline"}]},{"type":"paragraph","content":[{"type":"text","text":"Cette rencontre pourrait être l’occasion d’échanger simplement sur le spectacle et les possibilités d’accueil au sein de @structure."}]},{"type":"paragraph","content":[{"type":"text","text":"Bien à vous,"}]}]}'::jsonb,
    'Pour préparer votre venue, vous trouverez en pièces jointes : @pieces_jointes.',
    true
  )
on conflict (system_key) where system_key is not null do nothing;
