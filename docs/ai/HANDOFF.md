# Passage de relais actif

Date : 22 juillet 2026
Branche : `main`
Etat : lots 1 a 5 livres sur `main`, verifies et migrations 043 a 051 appliquees dans Supabase.

## Chantier en cours

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
