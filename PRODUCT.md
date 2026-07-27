# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

TaDiff s'adresse d'abord aux personnes qui dirigent ou administrent une compagnie de spectacle vivant. Elles pilotent la production, la diffusion, les financements, les échéances et la trésorerie, sans être nécessairement à l'aise avec les outils numériques ou le vocabulaire SaaS.

Les programmateurs, lieux, festivals, bureaux de production et artistes sont des interlocuteurs du travail de la compagnie, mais ne constituent pas la cible prioritaire du cockpit.

## Product Purpose

TaDiff est le cockpit de pilotage d'une compagnie de spectacle vivant. Il doit permettre de savoir rapidement quoi faire maintenant, quoi préparer ensuite et si la compagnie tient le cap.

Le produit réunit les spectacles, contacts, lieux, dates, diffusion, dossiers, financements et trésorerie afin d'aider une compagnie à vendre et financer ses projets, respecter ses échéances et éviter les décisions qui fragilisent son activité.

Le succès signifie qu'une compagnie peut accomplir ses tâches administratives courantes avec moins de friction, sans perdre d'information et sans devoir reconstruire le même contexte dans plusieurs outils.

## Positioning

TaDiff relie les informations opérationnelles d'une compagnie dans un même graphe métier : compagnie, spectacles, contacts, lieux, diffusion, actions, documents, financements et finances.

William s'appuie d'abord sur cet état réel et autorisé pour proposer un nombre limité d'actions prioritaires. Le RAG documentaire complète ce contexte pour expliquer une règle ou exploiter un document long, mais ne remplace pas les données métier vivantes.

Cette combinaison doit remplacer une partie du travail d'administration de production sans transformer le produit en logiciel de gestion générique.

## Operating Context

Les utilisateurs travaillent avec des affiches, dossiers artistiques, notes d'intention, synopsis, textes, fiches techniques, budgets, devis, contrats, feuilles de paie, échéances de subventions, carnets de contacts et calendriers de représentations.

Ils doivent notamment :

- préparer et suivre plusieurs spectacles ;
- identifier des lieux et des interlocuteurs ;
- organiser la diffusion, les relances et les invitations professionnelles ;
- suivre des cessions, coréalisations, locations et exploitations ;
- constituer des dossiers de subvention ou de mécénat ;
- anticiper les dépenses, recettes et risques de trésorerie ;
- conserver un historique utile des actions et décisions.

Les captations complètes restent de préférence hébergées par la compagnie sur YouTube ou Vimeo ; TaDiff conserve leur lien plutôt que la vidéo.

## Capabilities and Constraints

- Une compagnie correspond à un espace de travail isolé.
- Toute donnée métier doit respecter les autorisations et les règles RLS multi-compagnie.
- Les rôles plateforme, administrateur et compagnie ne donnent pas les mêmes accès.
- Toute action visible doit fonctionner réellement ou annoncer clairement qu'elle n'est pas encore disponible.
- Le produit emploie les termes du spectacle vivant : spectacles, contacts, lieux, dates, diffusion, trésorerie et dossiers.
- Les interfaces doivent rester compréhensibles pour une personne peu technique et utilisables au clavier, sur ordinateur et sur mobile lorsque le flux le justifie.
- William ne doit agir ou lire des documents qu'avec les autorisations nécessaires. Son usage est soumis à des quotas et à un suivi par compte ou compagnie.
- Les documents doivent pouvoir être exportés et rester séparés entre compagnies.
- Les décisions encore ouvertes, notamment la tarification définitive, les limites exactes des offres et les fournisseurs externes futurs, ne doivent pas être présentées comme acquises.

## Brand Commitments

Le produit s'appelle TaDiff et son assistant s'appelle William.

La voix doit être claire, directe, humaine et rassurante, sans jargon technique ni promesse impossible. TaDiff accompagne la compagnie et réduit la difficulté ressentie, sans infantiliser l'utilisateur.

Le logo de référence est disponible dans `02 - Ressources/logo-tadiff-mark.svg`. Les règles typographiques existantes sont documentées dans `02 - Ressources/TADIFF-charte-typographie (1).md`.

## Evidence on Hand

- L'état durable de l'application est suivi dans `docs/ai/PROJECT_STATE.md`.
- La stratégie et les modules métier sont documentés dans `docs/product/product-plan.md`.
- Les choix d'architecture et de sécurité sont documentés dans `docs/engineering/implementation-reference.md`.
- Un parcours de démonstration et une compagnie de démonstration réaliste existent dans l'application.
- Des captures et une présentation fonctionnelle sont disponibles dans `docs/presentations/webinaire-features-2026-07-23/`.
- Le dépôt contient des données et documents métier de référence dans `02 - Ressources/`.
- Aucun témoignage client, benchmark commercial ou résultat financier ne doit être inventé lorsqu'il n'est pas fourni.

## Product Principles

1. Montrer ce qui compte maintenant avant d'exposer toute la complexité.
2. Faire travailler les données ensemble au lieu de demander plusieurs fois la même information.
3. Parler comme une compagnie de spectacle vivant, pas comme un logiciel SaaS.
4. Aider à décider et à agir, pas seulement à stocker.
5. Garder l'utilisateur maître de ses données, documents, messages et décisions.

## Accessibility & Inclusion

Les interfaces doivent éviter de réserver les fonctions essentielles aux seuls survols, clics droits ou gestes précis. Les actions principales nécessitent une alternative visible et utilisable au clavier.

Les libellés, états, erreurs et confirmations doivent rester explicites. La densité d'information doit pouvoir servir le pilotage quotidien sans imposer une expertise comptable, administrative ou technique.
