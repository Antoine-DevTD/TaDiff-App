# Documentation TaDiff

Cette page est l'index documentaire du projet. Les fichiers racine sont limites aux conventions attendues par les outils : `README.md`, `AGENTS.md` et `CLAUDE.md`.

## Produit

- [`product/product-plan.md`](product/product-plan.md) : vision, planning, modules, backlog et decisions produit.

## Technique

- [`engineering/implementation-reference.md`](engineering/implementation-reference.md) : architecture, Supabase, securite, conventions UX, verification et contraintes de livraison.
- [`../sql/README_comped.md`](../sql/README_comped.md) : comptes offerts et statut de facturation.
- [`../lib/supabase/README.md`](../lib/supabase/README.md) : couche Supabase locale.

## Operations

- [`operations/demo-ux.md`](operations/demo-ux.md) : parcours de demonstration.
- [`operations/webinar-2026-07-23.md`](operations/webinar-2026-07-23.md) : deroule du webinaire.

## Legal et conformite

- [`legal/privacy-and-compliance.md`](legal/privacy-and-compliance.md) : checklist RGPD et collecte de donnees.
- [`legal/information-to-complete.md`](legal/information-to-complete.md) : informations juridiques et commerciales encore a renseigner.
- `../01 - Contrat/` : contre-proposition, messages et checklist avocat. Ces documents restent separes du produit et doivent etre valides par un professionnel.

## Ressources metier

- `../02 - Ressources/` : charte, notes de Tony et documents sources. Ce dossier contient des entrees de travail, pas la documentation canonique.

## Agents IA

- [`../AGENTS.md`](../AGENTS.md) : regles communes Codex et Claude.
- [`ai/CONTEXT_MAP.md`](ai/CONTEXT_MAP.md) : selection du contexte selon la tache.
- [`ai/PROJECT_STATE.md`](ai/PROJECT_STATE.md) : etat court du produit.
- [`ai/HANDOFF.md`](ai/HANDOFF.md) : travail actif a reprendre.
- `../.agents/skills/tadiff-workspace/SKILL.md` : workflow local commun aux agents.

## Regles de rangement

- Une decision produit durable va dans `product/product-plan.md`.
- Une contrainte technique durable va dans `engineering/implementation-reference.md`.
- Un document lie a une demonstration ou une exploitation va dans `operations/`.
- Une obligation ou information legale va dans `legal/`.
- Un etat temporaire entre agents va dans `ai/HANDOFF.md`.
- Ne pas recopier une meme information dans plusieurs fichiers ; ajouter un lien vers sa source canonique.
