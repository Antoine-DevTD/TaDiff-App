# Mise en service de la supervision bêta — 8 octobre 2026

La branche `codex/beta-supervision` part de `main=443a3b5`. Elle contient la supervision des compagnies et membres, l’attribution offerte, les invitations explicites et les protections Checkout/webhook nécessaires. Les autres travaux locaux sont exclus.

## SQL à appliquer

Dans le **SQL Editor du projet Supabase TaDiff**, copier puis exécuter tout le contenu de [`sql/releases/20261008_beta_supervision.sql`](../../sql/releases/20261008_beta_supervision.sql). Le fichier regroupe, en une seule transaction :

1. `086_access_codes.sql` : socle des accès offerts ou limités et des inscriptions en attente.
2. `087_pending_payment_signup.sql` : compte préparé, données métier fermées avant activation.
3. `088_stripe_checkout_and_events.sql` : tentatives de paiement et événements persistants.
4. `089_beta_complimentary_supervision.sql` : offre auditée et supervision des comptes/membres.

Les prérequis 021, 044, 063, 065 et leurs dépendances sont nécessaires. Le contrôle de l’API production retrouve les anciennes tables, colonnes et fonctions utiles ; les nouveaux objets 086–089 ne sont pas exposés. Ce contrôle ne certifie pas l’historique SQL ni les définitions RLS déployées.

Contrôle en lecture du 8 octobre : les effets de 080, 081 et 083 sont présents ; les tables 084 et 085 sont absentes de l’API. La présence de la RPC ne prouve pas le correctif 082, car sa signature existait déjà en 080. [`sql/diagnostics/check_rehearsal_fix_082.sql`](../../sql/diagnostics/check_rehearsal_fix_082.sql) permet de lire sa définition dans le SQL Editor. Ne pas rejouer aveuglément 080, 081 ou 083 : leur réapplication complète n’est pas garantie. 083–085 ne sont pas des prérequis du lot bêta.

Les quatre résultats de contrôle à la fin doivent être `true`. Une erreur annule toute la transaction ; conserver son texte et vérifier les prérequis avant de recommencer. Le lot complet est exécuté deux fois sur la même base PostgreSQL embarquée pendant les tests.

**Appliquer et qualifier le SQL avant publication dans `main`.** Un push Git n’applique pas la migration. Ne pas lancer `supabase db push` global : d’autres migrations locales sont présentes, et les miroirs CLI 086–088 manquent. Le miroir 089 fourni correspond au SQL source.

## Vérification après mise en service

Contrôler les permissions avec un administrateur, un membre d’une autre compagnie et un compte sans droit plateforme. Vérifier effectifs, rôles, pagination, erreur visible et accès aux dates réservé à `view_access`.

Tester l’offre sans compte puis avec un compte lié : aucun paiement fictif ni mail automatique, une seule trace d’attribution et une échéance vide pour l’offre illimitée. L’invitation se déclenche séparément ; son titulaire confirme son email et choisit son mot de passe. L’accueil laisse désormais au SQL le rattachement Auth et l’audit unique.

Un compte et une compagnie déjà créés avec un accès offert restent invitables tant que l’adresse n’est pas confirmée. L’envoi vérifie le compte Auth et le lien exact ; une offre expirée ou un compte confirmé est refusé. La date de création du compte ne sert plus de preuve de confirmation email.

Stripe revient vers `/billing` pour ce lot. Les protections empêchent un paiement en préparation ou un événement incompatible d’écraser une offre. Le raccordement reste à qualifier avec le compte autorisé **en mode test**, une nouvelle clé, le prix et le secret de signature : voir [la procédure Stripe](stripe-webhook-configuration-2026-10-05.md). Aucun secret n’est ajouté au dépôt. L’interface d’inscription directe, les codes dans l’interface et les demandes de retours par mail sont exclus.

## Limites

Vérification de la branche : lint complet hors dossiers temporaires, TypeScript sans cache, build optimisé webpack, français et diff réussis. Les suites ciblées totalisent 152 résultats Node réussis, aucun échec ni scénario ignoré, dont les parcours réels au clavier et à 390/1280 px. Le lot SQL complet et ses quatre contrôles finaux passent deux fois en PostgreSQL embarqué. Ces résultats sont locaux.

Aucune nouvelle variable propre à la supervision. Les invitations nécessitent la configuration administrative Supabase existante.

La validité de **sept jours** des liens Auth reste à régler par Management API avec `mailer_otp_exp=604800`, puis à relire. Ces migrations ne modifient pas ce réglage ; un lien reste à usage unique. Le push et le SQL n’envoient aucun email.

Les tests locaux emploient PostgreSQL embarqué et des doublures Auth/Stripe. Réception des mails, droits réellement déployés, concurrence multi-connexion et paiement de test restent à qualifier sur l’environnement cible.
