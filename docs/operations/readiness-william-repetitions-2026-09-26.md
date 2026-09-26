# État opérationnel — William, répétitions et matériel

Bilan du diagnostic et des vérifications avant publication, le 26 septembre 2026. L’utilisateur a ensuite autorisé le commit et le push du lot William et répétitions ; le périmètre de publication figure dans `docs/ai/PROJECT_STATE.md`.

## William : panne reproduite et service rétabli en ligne

- Le compte de démonstration possède bien l’autorisation William et un quota disponible. La lecture authentifiée des droits, de la configuration, de la conversation et du moteur documentaire fonctionne.
- Une question posée dans `https://tadiff.com/dashboard` échouait avec un HTTP 429 du fournisseur Mistral. Le même refus a été reproduit avec une requête minimale : `Rate limit exceeded`, catégorie `rate_limited`, code `1300`, sur `mistral-small-2603`. Ce refus est distinct du quota TaDiff.
- Le modèle `ministral-14b-2512`, chez le même fournisseur, a été testé avec succès puis configuré en remplacement provisoire dans `ai_settings`. Une réponse complète dans la conversation du compte démo a ensuite été vérifiée en ligne. Aucun abonnement fournisseur ni moyen de paiement modifié.
- Le premier essai a révélé une connaissance produit incomplète : William disait que les sondages de répétitions n’existaient pas. Un guide des fonctionnalités réellement publiées a été ajouté aux instructions permanentes, sans écraser les instructions antérieures. La réponse suivante utilise bien le module Répétitions et son lien TaDiff. Les réponses restent des propositions à relire ; cette vérification ne qualifie pas toutes les réponses futures.
- Le guide précise également que l’email n’est pas obligatoire pour répondre à un sondage, que le lieu se renseigne dans le sondage et qu’un dossier artistique n’est pas un prérequis aux répétitions.
- Les sessions de diagnostic ont été fermées. Les quelques questions de vérification et leurs réponses restent dans l’historique du compte démo ; aucun message existant n’a été supprimé.
- Retour arrière : ancien modèle `mistral-small-2603`, à réutiliser seulement après résolution de sa limite chez Mistral. Copie temporaire des instructions précédentes : `tmp/william-settings-before-guide-20260926.json`, sans clé API.

La documentation Mistral distingue les limites par seconde, minute et mois et les limites propres aux modèles. La cause administrative exacte nécessite l’accès à la console fournisseur ; la clé conversationnelle ne permet pas de lire son API d’administration. Source : [limites d’usage Mistral](https://help.mistral.ai/fr/articles/698531-pourquoi-est-ce-que-j-atteins-mes-limites-d-usage-api-et-comment-les-augmenter).

## Compte personnel à identifier

L’adresse exacte du compte signalé par l’utilisateur reste à confirmer. Le compte correspondant à l’adresse de support configurée, non reproduite ici, a été lu : William y est désactivé au niveau du profil et de la compagnie, avec quota et bonus à zéro. Aucun droit ni crédit de ce compte n’a été modifié sans confirmer qu’il s’agit du compte concerné.

## Corrections du lot de publication

### William

- La conversation et le champ libre étaient entièrement masqués lorsque l’accès était désactivé ou illisible, ce qui laissait seulement une recommandation. Le champ reste maintenant visible, l’indisponibilité est expliquée et les paramètres sont accessibles. Le serveur continue de contrôler les autorisations.
- Les erreurs de chargement, d’envoi et de nouvelle conversation sont traitées ; une question refusée est restaurée en brouillon sans écraser une nouvelle saisie.
- Les erreurs du fournisseur sont formulées en français : limite fournisseur, configuration, indisponibilité, délai dépassé ou réponse inexploitable. Aucun corps d’erreur distant ni secret n’est transmis à l’interface ; aucun réessai automatique en boucle.
- Le code contient le guide produit vérifié et les chemins Équipe, Répétitions, Matériel et Dates propres aux spectacles autorisés.

### Répétitions et matériel

- Lieu par défaut et commentaires affichés ; sondages toujours visibles après retrait des membres de l’équipe.
- Disponibilités chargées uniquement pour les sondages du spectacle et paginées au-delà de 1 000 réponses ; erreurs de lecture explicites.
- Fermeture et réouverture du sondage ; confirmation dans l’agenda avec retour visible et remise à zéro de la sélection.
- Une personne extérieure garde sa sélection après l’envoi de sa réponse. Une réponse masquée n’est plus annoncée comme affichée.
- Avant un rappel matériel utilisant le compte serveur, l’action vérifie explicitement que le spectacle appartient à la compagnie de l’utilisateur.
- Aucune nouvelle migration ni variable d’environnement pour ce lot.

## Validation

- Candidat de publication isolé : `tmp/readiness-release-20260926`, base exacte `88daea4`, 14 fichiers applicatifs, 6 tests et ce rapport. Lint complet, TypeScript, build et contrôle du français réussis ; **53 tests passent, aucun ignoré** (37 unitaires, 16 navigateur/PostgreSQL embarqué). Manifeste des fichiers et empreintes dans `tmp/readiness-release-20260926-manifest.json`. Gmail, retours libres et autres chantiers locaux exclus de ce candidat.
- Lint, TypeScript, contrôle des copies françaises et build passent sur la copie de vérification. Les tests William couvrent navigateur mobile/clavier, erreurs réseau, brouillon et fournisseur simulé. Les tests répétitions couvrent les lectures, lieux, commentaires, confirmation et fermeture.
- PostgreSQL embarqué PGlite : migrations réelles `001`, `072`, `080`, `081`, `082`, RPC métier et policies RLS réelles. Création, réponse/remplacement, réponse incomplète refusée, commentaire, confirmation idempotente, autre compagnie, rôle lecture seule et matériel vérifiés.
- La jointure PostgREST des réponses a été contrôlée à distance avec une sélection vide : HTTP 200, aucune donnée retournée.
- Les tests Supabase HTTP complets et la délivrance des rappels ne sont pas requalifiés par les tests embarqués. Aucun email réel envoyé pendant cette intervention.
- L’utilisateur a précisé que D::Light est incompatible avec la virtualisation sur ce poste. Ne pas démarrer Docker ni activer la virtualisation pour reprendre ces contrôles. Les processus Docker ouverts pendant l’investigation ont été arrêtés ; aucune configuration de virtualisation modifiée.
- Vérification PostgreSQL sans Docker : installer temporairement `@electric-sql/pglite@0.5.8` selon l’en-tête de `tests/unit/rehearsal-sql-embedded.test.mjs`, puis `node --test tests/unit/rehearsal-sql-embedded.test.mjs`. Dépendances du produit inchangées.

## Ce qui reste hors de ce lot

| Fonctionnement | État vérifié | Suite nécessaire |
| --- | --- | --- |
| Invitations et relances des répétitions | Partage manuel du lien collectif ; aucun envoi automatique | Développer et tester les envois si ce fonctionnement est retenu |
| Liens de répétition individuels | Absents ; chaque personne choisit son nom sur le lien collectif | Authentifier individuellement les réponses pour empêcher la sélection d’un autre nom |
| Visibilité des commentaires | Noms et commentaires accessibles aux détenteurs du lien collectif, même si les disponibilités sont masquées | Prévoir une évolution serveur si les commentaires doivent être réservés à la production |
| Archivage et révocation d’un sondage | Absents | Évolution complémentaire ; fermeture/réouverture incluses dans le correctif local |
| Rappels automatiques de matériel | Route protégée publiée ; ordonnanceur non attesté | Configurer le planificateur, `CRON_SECRET` et vérifier la délivrance |
| Retours libres par email | Code local ; table distante `feedback_requests` absente | Migration 084, publication et essai réel de réception |
| Gmail | Routes applicatives non publiées ; tables distantes présentes | Configuration OAuth, validation Google, tests et publication ; la lecture des réponses n’est pas implémentée |
| Paiement bêta externe | Validation et invitation manuelles | Rattacher le mois payé à la compagnie après l’accueil ; pas d’activation automatique depuis le lien Stripe externe |

## Publication

La base de ce lot est `88daea4`, déploiement GitHub Production `6314161104` réussi le 7 septembre 2026. De nombreux changements locaux sont hors de cette version et hors du présent lot.

Le projet réellement publié est `ta-diff/ta-diff-app`. L’association `.vercel/project.json` locale vise un autre projet, nommé `tadiff` ; ne pas l’utiliser pour un déploiement direct sans vérification. La publication autorisée passe par une copie Git isolée contenant les seuls correctifs validés, leurs tests et la documentation, puis un push sur `main`. Vérifier le statut du déploiement Vercel associé au commit avant d’annoncer la mise en ligne.
