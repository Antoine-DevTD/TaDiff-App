# Etat court du projet

Derniere verification : 20 juillet 2026.

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

## Etat technique a confirmer avant livraison

- Les migrations sont versionnees dans `sql/`; leur presence dans le depot ne prouve pas leur application dans Supabase.
- `036_opportunity_exploitation_models.sql` couvre les modeles economiques de diffusion.
- `037_email_templates.sql` couvre les templates email persistants.
- Stripe reste a valider de bout en bout avec les variables et webhooks de l'environnement cible.
- `038_platform_admin_and_ai_foundation.sql` ajoute les informations legales dynamiques, les catalogues globaux, les templates plateforme et la fondation RAG de William. Application Supabase confirmee par l'utilisateur le 20 juillet 2026.
- `039_ai_access_quotas_and_credits.sql` ajoute l'acces progressif par compte, les quotas mensuels, le journal d'usage et les credits Stripe.
- `042_william_operational_context.sql` met a jour le prompt par defaut. William combine desormais l'etat frais et autorise de la compagnie avec le RAG documentaire, au lieu de refuser une question de pilotage lorsqu'aucune source textuelle n'est retrouvee.

## Qualite

- Dernier passage connu le 20 juillet 2026 : lint, TypeScript, build et parcours Playwright passes.
- Relancer les controles apres toute modification ; ce statut n'est pas une garantie sur un worktree plus recent.

Pour la vision, le planning et le backlog complet, consulter `docs/product/product-plan.md`. Pour les contraintes d'implementation, consulter `docs/engineering/implementation-reference.md`.
