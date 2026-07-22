# Etat court du projet

Derniere verification : 22 juillet 2026.

## Socle

- Next.js App Router, React, TypeScript et Tailwind CSS.
- Supabase pour Auth, Postgres, Storage et RLS, avec donnees de demonstration lorsque prevu par le code.
- Deploiement Vercel et domaine `tadiff.com`.
- Application multi-compagnie avec roles et controles d'ecriture.

## Parcours deja presents

- Landing, reservation beta, authentification et recuperation de mot de passe.
- Cockpit, spectacles, documents, contacts, diffusion, agenda, finances, dossiers et administration.
- Import de contacts, donnees de demonstration, visite guidee et premiers flux William.
- Analytics publics limites et journal d'acces superadmin.
- Administration plateforme delegable avec permissions choisies par le superadmin, sans delegation des exemptions de paiement.
- Stockage documentaire interchangeable entre Supabase Storage et Cloudflare R2.
- Documents de travail versionnes par spectacle, lien de captation et limites de spectacles actifs par formule.
- Espace Ressources et suivi d'exploitation avec series, billetterie, resultat et preparation SACD.
- Composeur email complet partage entre Emails et Contacts, avec pieces jointes et demandes guidees a William. William dispose d'une interface conversationnelle, d'un affichage progressif et des raccourcis Entree / Maj + Entree.
- Carnet separe entre personnes et lieux. Une direction renseignee sur un lieu cree un contact personne rattache, et plusieurs personnes peuvent etre selectionnees pour preparer un email groupe en copie cachee.
- Les contacts disposent d'actions groupees pour preparer un email, creer une action par contact et supprimer une selection. Les suppressions sensibles de contacts, spectacles et documents utilisent une confirmation reutilisable par maintien de trois secondes.
- Les actions terminees restent consultables, acceptent un resultat facultatif et peuvent etre rouvertes. Les reports et clotures alimentent un historique borne exploitable par le contexte operationnel de William.
- L'onglet Presentation propose un atelier William persistant par spectacle pour travailler logline, synopsis, note d'intention et presentation de diffusion. Il peut mener un entretien ou lire uniquement les extraits PDF explicitement autorises, puis proposer un brouillon que l'utilisateur choisit d'appliquer.

## Etat technique a confirmer avant livraison

- Les migrations sont versionnees dans `sql/`; leur presence dans le depot ne prouve pas leur application dans Supabase.
- `036_opportunity_exploitation_models.sql` couvre les modeles economiques de diffusion.
- `037_email_templates.sql` couvre les templates email persistants.
- Stripe reste a valider de bout en bout avec les variables et webhooks de l'environnement cible.
- `038_platform_admin_and_ai_foundation.sql` ajoute les informations legales dynamiques, les catalogues globaux, les templates plateforme et la fondation RAG de William. Application Supabase confirmee par l'utilisateur le 20 juillet 2026.
- `039_ai_access_quotas_and_credits.sql` ajoute l'acces progressif par compte, les quotas mensuels, le journal d'usage et les credits Stripe.
- `042_william_operational_context.sql` met a jour le prompt par defaut. William combine desormais l'etat frais et autorise de la compagnie avec le RAG documentaire, au lieu de refuser une question de pilotage lorsqu'aucune source textuelle n'est retrouvee.
- Les migrations `043` a `048` ont ete appliquees dans Supabase le 21 juillet 2026, selon confirmation utilisateur.
- Les migrations `049` a `051` ont ete appliquees dans Supabase le 22 juillet 2026, selon confirmation utilisateur. Elles couvrent personnes/lieux, historique des actions et ateliers de redaction William.

## Qualite

- Dernier passage connu le 22 juillet 2026 : lint, TypeScript, build et 20 parcours Playwright passes, dont le replay webinaire et le rendu 3D desktop/mobile.
- Relancer les controles apres toute modification ; ce statut n'est pas une garantie sur un worktree plus recent.

Pour la vision, le planning et le backlog complet, consulter `docs/product/product-plan.md`. Pour les contraintes d'implementation, consulter `docs/engineering/implementation-reference.md`.
