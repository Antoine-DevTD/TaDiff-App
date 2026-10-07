# Supervision bêta et accès offerts — 5 octobre 2026

## Décisions et parcours

Suzanne doit disposer de sa propre compagnie avec un accès offert sans limite de durée. Le raccordement Stripe commence en mode test. Ces décisions sont implémentées localement ; aucun compte destinataire n’a été modifié en production.

`/admin?tab=beta` et `/admin/beta` proposent une recherche par compagnie, personne ou email, les comptes existants, l’espace réellement rattaché, son nombre de membres, les dernières connexions autorisées et des compteurs indépendants d’inscription, d’accès ouvert et d’accès offert. Les paiements manuels et envois groupés restent disponibles dans une section secondaire. Les modules d’administration sont chargés uniquement pour l’onglet demandé.

« Offrir l’accès » enregistre un motif facultatif et une décision interne, sans paiement confirmé fictif ni email automatique. Avec une compagnie existante, seul le responsable peut bénéficier de cette mutation de facturation partagée ; elle passe au statut offert sans échéance. Un membre ou lecteur doit être traité par le responsable de sa compagnie. Un paiement déjà confirmé, un abonnement Stripe ou une session en préparation empêche de remplacer silencieusement l’accès existant.

Sans compte, l’offre est réservée à cette inscription. « Envoyer l’invitation » est une action séparée, puis la personne confirme son adresse et choisit son mot de passe. Son espace offert est créé lors de la préparation authentifiée de sa compagnie. Les noms de compagnies ne servent jamais à fusionner des identités ; le lien Auth explicite prime, puis l’email exact normalisé seulement s’il est unique. Aucun compte Auth n’est créé ni confirmé par la simple attribution.

La supervision principale place les compagnies et leurs membres en premier : recherche par membre, détail dépliable, rôle, effectif complet, accès ouvert/fermé et formule. Les dates viennent des événements conservés et ne constituent pas une présence en temps réel. Les réglages d’accès et de facturation restent accessibles par compagnie ; revenus estimés, journal d’accès et maintenance sont secondaires.

## Autorisations et données

- Attribution d’un accès offert : superadministrateur connecté, contrôle SQL et événement d’audit dans la même transaction.
- Consultation bêta : `view_beta`. Dates de connexion : `view_access`.
- Membres de toutes les compagnies : `view_companies`. Leurs dates demandent aussi `view_access`.
- Les lectures parcourent toutes les pages, vérifient le nombre exact et refusent un chargement partiel. Une panne ou migration manquante est affichée comme indisponibilité, jamais comme zéro inscription/membre.
- Une offre historique n’ouvre pas automatiquement une compagnie suspendue ensuite. Les accès offerts encore valables bloquent tout nouveau Checkout, y compris au moment de la réservation SQL.

## Mise en service et qualification

Appliquer `sql/089_beta_complimentary_supervision.sql` après ses prérequis 021, 044, 063, 065 et 086–088. Son fichier de migration CLI correspondant est `supabase/migrations/20261005155309_beta_complimentary_supervision.sql`. Aucun nouveau secret ou variable propre à la supervision. Le raccordement utilise les variables Stripe existantes : voir [configuration du webhook](../operations/stripe-webhook-configuration-2026-10-05.md).

La validation locale utilise des composants React réels avec actions distantes simulées et PostgreSQL embarqué. Elle couvre autorisations, isolation, absence de faux paiement, attribution répétée, identité ambiguë, compte non confirmé, invitation explicite, pagination, erreurs/reprise, clavier et largeurs 390/1280 px. Les suites existantes d’inscription et de facturation sont rejouées : 115 résultats Node réussis (110 scénarios et cinq conteneurs), aucun échec ni scénario ignoré. La pagination fonctionne aussi avec un plafond API inférieur à la taille demandée.

Le contrôle du français, TypeScript et le diff passent. Le lint complet et le build optimisé passent dans `tmp/beta-supervision-verification-20261005`, copie isolée sans identifiants et avec `TADIFF_E2E_MODE=playwright-local`. Le lint du dépôt principal parcourait des anciennes copies générées sous `tmp` ; il a été interrompu et remplacé par le contrôle complet de cette copie propre, sans modifier la configuration du dépôt. Les deux fichiers SQL 089/CLI sont identiques.

La création réelle d’un compte, la réception d’une invitation Auth et la livraison Stripe restent à qualifier sur l’environnement de test. Aucune migration distante, invitation réelle, facture, commit, push ou publication n’est réalisé par ce lot.
