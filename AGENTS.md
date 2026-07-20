# TaDiff - Instructions agents

Ce fichier est le point d'entree court pour tout agent travaillant dans ce depot.

## Lecture minimale

1. Lire `docs/ai/CONTEXT_MAP.md`.
2. Charger uniquement les fichiers indiques pour la tache.
3. Lire `docs/ai/HANDOFF.md` en cas de reprise ou de travail partage.
4. Verifier `git status --short --branch` avant toute modification.

`docs/engineering/implementation-reference.md` et `docs/product/product-plan.md` sont les references detaillees. Les consulter par recherche ciblee avec `rg`, pas integralement par defaut.

## Regles non negociables

- TaDiff est un cockpit pour compagnies de spectacle vivant, pas un SaaS generique.
- Employer des termes metier simples : spectacles, contacts, dates, diffusion, tresorerie, dossiers.
- Toute action visible doit fonctionner ou annoncer clairement qu'elle n'est pas encore branchee.
- Preserver les changements non commites et ne jamais revenir sur le travail d'un autre agent sans demande.
- Respecter l'isolation multi-compagnie. Toute donnee liee a une compagnie exige une verification d'autorisation et de RLS.
- Une evolution de schema comprend migration, policies/RLS, types, appels applicatifs et tests adaptes.
- Reutiliser les composants et conventions existants avant d'ajouter une abstraction.
- Ne pas commit ni push sans demande explicite.

## Definition de termine

- Flux utilisateur verifie, y compris vide, erreur, clavier et mobile si pertinent.
- `npm run lint`, `npx tsc --noEmit`, `npm run build` et tests cibles selon le risque.
- Migration et variables d'environnement signalees explicitement.
- `docs/ai/HANDOFF.md` mis a jour seulement si une reprise est necessaire.
- `docs/ai/PROJECT_STATE.md` mis a jour si l'etat durable du produit change.
