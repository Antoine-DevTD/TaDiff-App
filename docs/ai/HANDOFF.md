# Passage de relais actif

## Corrections dates, minimum garanti et contacts — 7 septembre 2026

- Dates : représentations des exploitations et événements de l’agenda rattachés au spectacle, en plus des propositions de diffusion. Les créneaux non confirmés restent dans Répétitions.
- Minimum garanti au théâtre dans les calculs des propositions, exploitations et budgets ; recette compagnie négative possible.
- Contacts d’équipe sans structure ni email obligatoires ; création directe depuis le spectacle avec métier, personnage et alternance distincts. Aucun compte utilisateur créé.
- Publication demandée par l’utilisateur sur main. Aucune migration ni nouvelle variable nécessaire. Google, prospection et autres chantiers locaux exclus.
- Vérifications locales : lint, types, build, copie française, tests de calcul et parcours connecté dates/contacts, clavier et mobile.

## Observabilite des parcours compagnie et resilience — 6 aout 2026

- La nouvelle route `/admin/companies` presente au superadmin, ou a un administrateur disposant de `view_companies`, des compteurs et jalons d'usage par compagnie sans exposer le contenu des contacts, documents, budgets, emails ou questions William.
- Migration `sql/073_admin_company_workflow_metrics.sql` confirmee appliquee par l'utilisateur le 6 aout 2026. Le refus anonyme et l'absence de donnees avec la cle de service sans session ont ete verifies ; terminer la matrice d'acces en Preview avec un membre, un administrateur autorise et un superadmin connectes.
- Les principes de collecte sont documentes dans `docs/product/company-workflow-observability.md` et le plan de sauvegarde, restauration et chiffrement dans `docs/engineering/backup-recovery-encryption.md`.
- La sauvegarde externe et le chiffrement applicatif des documents restent un plan d'implementation : ils ne sont pas encore actifs en production.

## Livraison retours 2 à 8 — 5 août 2026

- Code validé localement : TypeScript, lint, build, budget unitaire et 28 parcours Playwright (27 au premier passage, puis le seul test d'accent corrigé et repassé).
- Appliquer `sql/069_email_template_preferences.sql` puis `sql/070_application_error_notifications.sql` avant la promotion du commit.
- Ajouter facultativement `BANK_CONNECTION_URL`; le bouton reste volontairement désactivé sans cette variable. `ERROR_NOTIFICATION_EMAIL` et `ERROR_NOTIFICATION_FROM` ont des valeurs TaDiff de repli.
- Les modifications utilisateur de `03 - retours/Propositions 22-07-2026.md` et `components/william/william-bubble.tsx` restent hors du commit.

## Reprise du 5 aout 2026

- Le commit `2b0425c` stabilise dates multiples, lien Diffusion/Exploitation, William beta et saisie `@`.
- Les migrations 066 a 068 sont pretes localement : budget guide persistant, champs Contacts/Lieux avec RLS, tarifs et projections d'exploitation.
- Ne pas deployer ces interfaces avant application des migrations 065 a 068 et smoke tests en Preview.
- Le fichier `03 - retours/Propositions 22-07-2026.md` et les modifications preexistantes de `components/william/william-bubble.tsx` et `tests/e2e/ux-smoke.spec.ts` restent hors du lot a committer.

Date : 22 juillet 2026
Branche : `main`
Etat : lots 1 a 5 livres sur `main`, verifies et migrations 043 a 051 appliquees dans Supabase.

## Chantier en cours

### Catalogue, emails et prise en main trésorerie à livrer

- Appliquer `sql/064_unify_grant_catalog_and_email_variants.sql` avant de déployer le code correspondant.
- Vérifier dans `/admin?tab=catalogues` que les références historiques apparaissent, puis corriger leurs dates et désactiver celles qui ne sont plus fiables.
- Vérifier dans `/admin?tab=emails` les trois modèles proposés, leur variation avec pièces jointes et l'autocomplétion des variables `@...`.
- Tester `/finances` avec une compagnie sans solde ni frais fixe : le parcours doit enregistrer les données puis afficher la projection.

### Console d'acces beta a activer

- Migration `sql/063_beta_access_workflow.sql` confirmee appliquee en production par l'utilisateur le 4 aout 2026.
- Verifier dans Vercel Production et Preview : `RESEND_API_KEY`, `BETA_PAYMENT_LINK_URL` et `BETA_SIGNUP_NOTIFICATION_FROM`.
- Le lien Stripe actuel est traite comme un paiement unique de 19,99 EUR pour le premier mois, sans renouvellement automatique.
- L'invitation transmet le nom, la compagnie, la discipline et le besoin principal. `/welcome` confirme les informations préremplies puis ouvre directement la première action choisie ; le logo reste facultatif.
- Effectuer un envoi vers une adresse interne, confirmer le paiement manuellement puis tester l'invitation dans une fenetre privee.

### Correctif inscription bêta à livrer

- `sql/060_fix_beta_signup_registration.sql` qualifie `beta_signups.position` dans la RPC publique et ajoute le retour `is_new`.
- `app/(public)/beta/actions.ts` envoie une seule alerte interne et, pour une place réservée, un email de bienvenue au candidat avec rendez-vous le 6 août 2026 à 10 h et lien agenda `.ics`. Une panne Resend n'annule pas l'inscription.
- Appliquer la migration `060`, configurer `RESEND_API_KEY` et éventuellement `BETA_SIGNUP_NOTIFICATION_EMAIL` / `BETA_SIGNUP_NOTIFICATION_FROM` dans Vercel, puis déployer et tester une vraie demande bêta.

### Lots 3 a 5 termines localement le 21 juillet

- Administration deleguee : un superadmin peut nommer un admin plateforme et choisir ses permissions. Les exemptions de paiement, comptes fondateurs, quotas IA et maintenance restent reserves au superadmin.
- Stockage : abstraction privee Supabase Storage ou Cloudflare R2 pour les documents. Les affiches restent dans Supabase. R2 necessite les variables de `.env.example` et une regle CORS autorisant les PUT depuis le domaine de l'application.
- Spectacles : lien de captation, limite de spectacles actifs par formule, documents non classes a renseigner et espace de documents de travail versionnes par spectacle.
- Navigation : ressources metier ajoutees, facturation retiree de la navigation principale, vocabulaire diffusion simplifie et parametres nettoyes.
- Diffusion : series d'exploitation, cession/corealisation/location, billetterie par representation, resultat courant et preparation SACD a verifier.
- Migrations `043_william_question_analytics.sql` a `048_exploitations_ticketing_sacd.sql` appliquees dans Supabase, confirmation utilisateur du 21 juillet 2026.

- Retours Tony du 21 juillet consignés dans `03 - retours/2026-07-21-retours-revue-tony.md`.
- Lot 1 webinaire terminé : ordre du cockpit, onboarding en 6 étapes, bêta à 15 places, relecture protégée du parcours `demo_webinaire`, Markdown William et correctifs de création/complétion des actions.
- Lot 2 William et emails terminé : panneau compact/étendu, questions rapides, périmètre métier, statistiques privées, rédaction assistée et pièces jointes avant messagerie.
- Actions : archive des actions terminees, compte rendu, reouverture et historique de reports ajoutes. Migration `050` appliquee dans Supabase.
- William : atelier persistant par spectacle pour logline, synopsis, note d'intention et presentation de diffusion. Migration `051` appliquee dans Supabase.
- Webinaire : le compte `demo_webinaire@yopmail.com` peut rejouer `/welcome?replay=1` sans creation de compte ni suppression des donnees. Le personnage 3D de bienvenue est remplace par le logo TaDiff extrude.
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
- `sql/049_contact_people_and_venues.sql`
- `lib/ai/company-context.ts`
- `types/database.types.ts`
- `sql/060_fix_beta_signup_registration.sql`
- `lib/beta-signup-notification.ts`

## Verification connue

- TypeScript, lint et build passent apres les lots 1 a 5.
- Les 20 parcours Playwright passent, avec controle du replay webinaire et du canvas 3D sur desktop et mobile.
- `git diff --check` passe, avec seulement les avertissements de conversion LF/CRLF du poste Windows.
- Confirmer l'application des migrations `036` et `037` dans Supabase avant de tester les flux persistants.
- Les migrations `049`, `050` et `051` sont confirmees appliquees dans Supabase le 22 juillet 2026.

## Regle de reprise

Commencer par `git diff --stat` puis inspecter les diffs des fichiers vises. Ne pas supposer que tous les changements non commites appartiennent au meme chantier.
