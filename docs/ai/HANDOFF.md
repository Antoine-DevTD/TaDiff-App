# Passage de relais actif

Date : 20 juillet 2026
Branche : `main`
Etat : changements applicatifs verifies et livres ; des ressources locales non suivies peuvent rester presentes.

## Chantier en cours

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

- Lint, TypeScript, build et 14 parcours Playwright etaient passes avant la creation de ce passage de relais.
- Confirmer l'application des migrations `036` et `037` dans Supabase avant de tester les flux persistants.

## Regle de reprise

Commencer par `git diff --stat` puis inspecter les diffs des fichiers vises. Ne pas supposer que tous les changements non commites appartiennent au meme chantier.
