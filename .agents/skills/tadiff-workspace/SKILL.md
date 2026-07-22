---
name: tadiff-workspace
description: Reprendre, developper, auditer ou transmettre le projet TaDiff avec un contexte minimal, fiable et partage entre Codex et Claude. Utiliser pour toute tache dans le depot TaDiff, notamment une reprise de session, un passage de relais, une modification React/Next.js/Supabase, une migration, une verification avant commit ou une coordination entre plusieurs agents.
---

# Travailler sur TaDiff

## Demarrer

1. Lire `AGENTS.md` a la racine du depot.
2. Lire `docs/ai/CONTEXT_MAP.md` et charger uniquement le parcours lie a la tache.
3. Executer `scripts/context-snapshot.ps1` depuis ce skill pour obtenir un etat Git et migrations compact.
4. Lire `docs/ai/HANDOFF.md` si une autre session ou un autre agent a travaille sur le depot.
5. Inspecter les fichiers cibles avant de proposer une solution.

Ne pas relire integralement `docs/engineering/implementation-reference.md` ou `docs/product/product-plan.md` sauf audit global. Utiliser `rg` sur leurs titres et mots-cles, puis lire seulement les sections utiles.

## Executer

- Respecter le vocabulaire du spectacle vivant et la regle produit : aucune action visible ne doit etre fictive ou silencieuse.
- Reutiliser les composants, Server Actions, requetes et schemas existants.
- Pour Supabase, verifier ensemble migration, RLS, types TypeScript, requetes et tests d'isolation par compagnie.
- Pour une interface, verifier le flux complet, les etats vide/chargement/erreur, le clavier, le mobile et l'absence de doublons.
- Ne jamais ecraser les modifications non commitees d'un autre agent.
- Repartir les agents par fichiers ou domaines distincts. Un seul agent possede une migration et ses types associes.

## Terminer

1. Executer les controles proportionnes : lint, types, build et tests cibles.
2. Consigner dans `docs/ai/HANDOFF.md` uniquement si la tache reste en cours ou doit etre reprise ailleurs.
3. Mettre a jour `docs/ai/PROJECT_STATE.md` seulement si l'etat durable du produit change.
4. Signaler les migrations a appliquer, variables d'environnement, tests non lances et risques restants.
5. Ne pas commit ni push sans demande explicite.

## Limiter le contexte

- Preferer `rg --files`, `rg -n` et les lectures bornees aux lectures completes.
- Resumer les sorties volumineuses et conserver les erreurs exactes utiles au diagnostic.
- Ne pas dupliquer une information : les decisions durables vont dans `docs/product/product-plan.md`, l'etat court dans `PROJECT_STATE.md`, le travail en cours dans `HANDOFF.md`.
- Utiliser plusieurs agents seulement pour au moins trois sous-taches independantes ou pour isoler un contexte reellement volumineux.

## Router vers les skills globaux

- Activer `filesystem-context` pour externaliser des sorties longues, partager des constats ou maintenir un travail sur plusieurs sessions.
- Activer `context-compression` pour produire un passage de relais fiable ou compacter une longue session.
- Activer `context-optimization` quand les lectures, sorties d'outils ou prompts consomment trop de contexte.
- Activer `multi-agent-patterns` seulement pour decomposer des chantiers reellement independants et definir leurs proprietaires.
