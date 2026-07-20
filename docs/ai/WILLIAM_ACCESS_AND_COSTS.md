# William - acces, quotas et couts

Etat au 20 juillet 2026.

## Regles d'acces

- `ai_settings.enabled` est le coupe-circuit global.
- Le super-admin est un compte technique reserve a la console interne ; il n'a pas de cockpit compagnie.
- Un compte fondateur reste un compte compagnie normal et dispose d'un quota personnel de 5 000 000 de tokens par mois.
- Un autre utilisateur doit avoir a la fois sa compagnie activee et son compte explicitement autorise.
- Un compte offert (`billing_status = comped`) n'obtient pas automatiquement William.
- Le quota mensuel et les credits supplementaires sont partages par la compagnie, hors consommation du compte fondateur.

## Comptage

- Chaque appel reserve un budget maximal avant de contacter le fournisseur.
- La consommation reelle retournee par le fournisseur est journalisee apres l'appel.
- Une reservation abandonnee est liberee automatiquement apres 15 minutes.
- Le quota mensuel se reinitialise au debut du mois.
- Les credits achetes sont utilises apres le quota inclus et ne sont pas reinitialises.

## Choix fournisseur

- Production recommandee : `mistral-small-2603` pour le compromis cout, francais, traitement europeen et confidentialite API.
- Comparatif de rodage : `deepseek-v4-flash` pour mesurer le cout minimal sur des donnees non sensibles.
- Embeddings recommandes : `text-embedding-3-small` chez OpenAI tant que l'index reste en 1536 dimensions.
- Monter ponctuellement vers OpenAI ou Claude pour les dossiers longs, sensibles ou necessitant une meilleure stabilite redactionnelle.
- Avant d'envoyer des contrats, coordonnees bancaires ou donnees personnelles a un fournisseur, valider le DPA, la retention et la localisation des traitements.

Sources tarifaires a recontroler avant toute modification commerciale :

- https://api-docs.deepseek.com/quick_start/pricing
- https://developers.openai.com/api/docs/pricing
- https://docs.anthropic.com/en/docs/about-claude/pricing
- https://docs.mistral.ai/models/model-selection-guide

## Stripe

Creer trois tarifs ponctuels puis renseigner :

- `STRIPE_PRICE_AI_100K`
- `STRIPE_PRICE_AI_500K`
- `STRIPE_PRICE_AI_2M`

Le webhook credite la compagnie de maniere idempotente avec l'identifiant de session Checkout.
