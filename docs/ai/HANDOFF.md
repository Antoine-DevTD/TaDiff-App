# Passage de relais actif

Date : 21 juillet 2026
Branche : `main`
Etat : lots 1 a 5 implementes localement et verifies ; changements non commites et migrations 043 a 048 non appliquees.

## Chantier en cours

### Lots 3 a 5 termines localement le 21 juillet

- Administration deleguee : un superadmin peut nommer un admin plateforme et choisir ses permissions. Les exemptions de paiement, comptes fondateurs, quotas IA et maintenance restent reserves au superadmin.
- Stockage : abstraction privee Supabase Storage ou Cloudflare R2 pour les documents. Les affiches restent dans Supabase. R2 necessite les variables de `.env.example` et une regle CORS autorisant les PUT depuis le domaine de l'application.
- Spectacles : lien de captation, limite de spectacles actifs par formule, documents non classes a renseigner et espace de documents de travail versionnes par spectacle.
- Navigation : ressources metier ajoutees, facturation retiree de la navigation principale, vocabulaire diffusion simplifie et parametres nettoyes.
- Diffusion : series d'exploitation, cession/corealisation/location, billetterie par representation, resultat courant et preparation SACD a verifier.
- Migrations a appliquer dans l'ordre : `043_william_question_analytics.sql`, `044_platform_admin_permissions.sql`, `045_storage_provider_abstraction.sql`, `046_show_workspace_and_plan_limits.sql`, `047_platform_resources.sql`, `048_exploitations_ticketing_sacd.sql`.
- Le CLI Supabase local n'est pas lie au projet et aucun jeton ou mot de passe de base n'est disponible dans l'environnement. Les migrations n'ont donc pas ete appliquees depuis cette session.

- Retours Tony du 21 juillet consignés dans `03 - retours/2026-07-21-retours-revue-tony.md`.
- Lot 1 webinaire terminé : ordre du cockpit, onboarding en 6 étapes, bêta à 15 places, relecture protégée du parcours `demo_webinaire`, Markdown William et correctifs de création/complétion des actions.
- Lot 2 William et emails terminé : panneau compact/étendu, questions rapides, périmètre métier, statistiques privées, rédaction assistée et pièces jointes avant messagerie.
- Appliquer `sql/043_william_question_analytics.sql` avant d'attendre des statistiques dans l'administration.
- Prochaine tranche recommandée : lot 3, spectacles et documents.

- Refonte de la diffusion pour prendre en charge cession, partage de recettes, minimum garanti et location.
- Enrichissement des emails : profil de spectacle, templates, variables et editeur riche.
- Amelioration du dossier spectacle : depot multiple, visualisation, telechargement et remplacement de versions.
- Console plateforme : migration `038_platform_admin_and_ai_foundation.sql`, informations legales, catalogues, templates globaux et configuration William/RAG ajoutes au code ; application Supabase confirmee le 20 juillet 2026.
- Acces William : migration `039_ai_access_quotas_and_credits.sql`, autorisations par compte, quotas mensuels et achats de credits ajoutes au code ; migration a appliquer avant le rodage.
- Pilotage William : `lib/ai/company-context.ts` construit un contexte borne et filtre par compagnie avant chaque reponse. La migration `042_william_operational_context.sql` doit etre appliquee pour remplacer l'ancien prompt par defaut sans ecraser un prompt admin personnalise.

## Fichiers et migrations sensibles

- `components/pipeline/`, `lib/pipeline.ts`, `lib/validation/pipeline.ts`
- `components/campaigns/`, `components/contacts/contact-email-assistant.tsx`
- `components/documents/`, `lib/show-documents.ts`
- `sql/036_opportunity_exploitation_models.sql`
- `sql/037_email_templates.sql`
- `sql/038_platform_admin_and_ai_foundation.sql`
- `sql/039_ai_access_quotas_and_credits.sql`
- `sql/042_william_operational_context.sql`
- `lib/ai/company-context.ts`
- `types/database.types.ts`

## Verification connue

- TypeScript, lint et build passent apres les lots 1 a 5.
- Les 16 parcours Playwright passent ; le parcours spectacle a ete relance seul apres un premier echec intermittent d'assertion d'URL.
- `git diff --check` passe, avec seulement les avertissements de conversion LF/CRLF du poste Windows.
- Confirmer l'application des migrations `036` et `037` dans Supabase avant de tester les flux persistants.

## Regle de reprise

Commencer par `git diff --stat` puis inspecter les diffs des fichiers vises. Ne pas supposer que tous les changements non commites appartiennent au meme chantier.
