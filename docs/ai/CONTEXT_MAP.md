# Carte de contexte TaDiff

Utiliser cette carte apres `AGENTS.md`. Lire seulement le parcours utile.

## Toujours

- `docs/ai/PROJECT_STATE.md` : etat court et durable.
- `docs/ai/HANDOFF.md` : travail en cours, uniquement en reprise de session.
- `git status --short --branch` : proprietaires implicites des fichiers modifies.

## Produit et UX

- `docs/product/product-plan.md` : rechercher le module et lire sa section.
- `docs/engineering/implementation-reference.md` : sections Vision, Regle produit centrale et UX/design.
- `02 - Ressources/` : charte, notes et sources metier, seulement si la tache les cite.
- `app/globals.css`, `components/ui/`, `components/layout/` : conventions visuelles existantes.

## Spectacles et documents

- `app/(dashboard)/shows/`
- `components/documents/`
- `lib/show-documents.ts`
- `lib/supabase/queries.ts`
- migrations `033_*`, `034_*` et `035_*` si la tache touche les documents, budgets ou profils email.

## Contacts, diffusion et emails

- `app/(dashboard)/contacts/`, `components/contacts/`, `components/tables/contacts-table.tsx`
- `components/pipeline/`, `lib/pipeline.ts`, `lib/validation/pipeline.ts`
- `app/(dashboard)/campaigns/`, `components/campaigns/`
- migrations `032_*`, `036_*` et `037_*` selon le sujet.

## Supabase, auth et securite

- `docs/engineering/implementation-reference.md` : sections Supabase, roles et tests de securite.
- `lib/supabase/`, `lib/validation/`, `types/database.types.ts`
- migration concernee dans `sql/`, puis policies, index et RPC associes.
- tests d'acces : non connecte, autre compagnie, bon membre, role lecture seule et superadmin si applicable.

## Landing, beta et analytics

- `app/(public)/`, `components/public/`
- `app/(dashboard)/admin/` et composants admin associes.
- migrations `028_*` a `031_*`.
- `docs/legal/privacy-and-compliance.md`, `docs/legal/information-to-complete.md` et pages juridiques si la collecte change.

## Contrat et gouvernance

- `01 - Contrat/`
- Ne pas charger ces documents pour une tache purement technique.

## Verification et livraison

- `package.json` pour les commandes disponibles.
- `tests/e2e/` pour les parcours existants.
- Avant commit : `git diff --check`, controles cibles, puis revue de `git status`.
