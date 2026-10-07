# Configuration du webhook Stripe — 5 octobre 2026

## État et accès nécessaires

Le récepteur `POST /api/stripe/webhook` existe dans le dépôt. Ce document décrit son raccordement ; il n’atteste aucune configuration Stripe, migration distante ou publication.

Décision du 5 octobre : commencer en **mode test Stripe**, conformément au choix de l’utilisateur. La mise en service du mode réel reste une étape ultérieure distincte.

La clé Stripe présente localement appartient à l’ancienne configuration, selon l’utilisateur. Sa présence et son format test ne valident ni son compte ni ses permissions. La remplacer par une clé de test du compte auquel Tony a donné accès avant tout raccordement. Ne pas révoquer l’ancienne clé Stripe sans vérifier ses autres usages ; remplacer la configuration TaDiff ne nécessite pas sa révocation.

Le rôle Stripe **Developer** permet de gérer les clés API, les produits, les clients et presque tous les paramètres produit. Il convient à cette intégration ; il ne permet pas d’inviter des membres, de changer le propriétaire du compte ou de modifier ses coordonnées bancaires. Vérifier que l’accès concerne le compte TaDiff qui reçoit les paiements, avec un environnement de test accessible. [Rôles Stripe](https://docs.stripe.com/get-started/account/teams/roles)

Pour le raccordement, il faut l’accès au compte Stripe, aux variables serveur de l’hébergement et au projet Supabase concerné. Les clés restent dans les paramètres sécurisés de l’hébergement ; ne pas les transmettre dans un message, un email ou une capture.

## Préparer le serveur

| Variable | Contenu attendu |
| --- | --- |
| `STRIPE_SECRET_KEY` | Clé secrète du compte et du mode concernés. |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature propre à la destination, préfixé `whsec_`. |
| `STRIPE_PRICE_BETA_MONTHLY` | Identifiant `price_` du prix bêta actif : abonnement mensuel, 19,99 EUR TTC, quantité 1, sans taxe additionnelle. |
| `NEXT_PUBLIC_APP_URL` | URL HTTPS canonique de l’application publiée. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase du même environnement. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique du même projet, nécessaire au parcours authentifié de test. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé Supabase serveur ; jamais exposée au navigateur. |

Le webhook ne demande pas de clé Stripe publique. Les prix Solo/Pro/Studio et les crédits William ne sont pas requis pour ouvrir le parcours bêta.

Appliquer les prérequis de `sql/086_access_codes.sql` si nécessaire, puis les migrations `sql/087_pending_payment_signup.sql`, `sql/088_stripe_checkout_and_events.sql` et `sql/089_beta_complimentary_supervision.sql`, d’abord sur une base de test. Les tables de tentatives et d’événements sont réservées au serveur. Préparer aussi les confirmations Auth, SMTP, retours `/auth/callback` et `/auth/confirm`, ainsi que les conditions publiques cohérentes avec l’offre. Voir [la procédure d’inscription directe](./direct-signup-stripe-2026-10-04.md).

## Enregistrer la destination dans Stripe

1. Ouvrir **Workbench → Webhooks → Create an event destination** dans le bon compte et environnement.
2. Choisir **Your account**, une destination **Webhook endpoint** et des événements **snapshot**. Le récepteur actuel utilise les objets complets de ces événements.
3. Choisir une version API compatible avec le SDK installé. À la date de cette vérification : `stripe` **22.3.0**, version API par défaut **`2026-06-24.dahlia`**, lue dans `node_modules/stripe/cjs/apiVersion.js`. Revérifier cette valeur après toute mise à jour du SDK ; ne pas changer la version globale du compte pour ce raccordement.
4. Sélectionner uniquement les événements nécessaires :
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Saisir l’URL publique HTTPS de la route. En production, l’URL prévue est `https://tadiff.com/api/stripe/webhook`, à confirmer sur le déploiement concerné. La route doit accepter les POST sans connexion, protection de prévisualisation ou redirection.
6. Placer le secret de signature de cette destination dans `STRIPE_WEBHOOK_SECRET`, puis reconstruire/redéployer l’application selon les règles de l’hébergement.

Stripe exige une URL publique HTTPS et permet de choisir les événements et leur version API. Le récepteur vérifie la signature sur le corps brut avant tout traitement. [Configuration officielle des webhooks](https://docs.stripe.com/webhooks), [versions des événements](https://docs.stripe.com/webhooks#api-versioning)

## Qualifier en test avant le mode réel

Utiliser un projet Supabase de test, un hébergement de test et les clés/prix/destination Stripe correspondants. Le fichier `.env.local` principal du dépôt cible la production : ne pas l’utiliser pour cette qualification.

Tester un compte neuf jusqu’à l’accès au cockpit, l’annulation du Checkout, l’email non confirmé, le retour navigateur sans confirmation, les tentatives répétées, les événements rejoués, un échec de paiement et une résiliation. Contrôler à la fois la livraison dans **Event deliveries** et le rattachement exact à la compagnie dans TaDiff. Une réponse HTTP 200 confirme la livraison, pas nécessairement l’activation : les événements étrangers ou sans preuve de paiement sont ignorés.

La signature CLI locale utilise un secret différent de celui d’une destination du Dashboard. Ne pas intervertir ces secrets ni mélanger les clés, prix et destinations de test et réels. [Secrets de signature](https://docs.stripe.com/webhooks/signature)

Le mode réel demande une destination et des valeurs serveur correspondantes, puis une vérification du déploiement. L’ouverture publique des inscriptions utilise `TADIFF_DIRECT_SIGNUP_ENABLED=true` et une valeur cohérente de `NEXT_PUBLIC_LEGAL_VERSION` ; elle intervient seulement après qualification. Aucun paiement réel n’est nécessaire pour les tests ci-dessus.

## Accès offert et paiements existants

Un accès offert se décide dans l’administration TaDiff avec le statut `comped`, une éventuelle échéance et un motif. Il n’a pas besoin d’un webhook ni d’un paiement. Le serveur refuse d’ouvrir ou de reprendre un Checkout lorsque cet accès offert est encore valable.

Une facture Stripe à zéro ne débloque pas un compte en attente dans l’intégration actuelle : le paiement confirmé exige `amount_paid > 0`. Un coupon à 100 % n’est donc pas le mécanisme d’accès offert.

Accorder un accès dans TaDiff ne résilie pas un abonnement Stripe et n’annule pas une page de paiement déjà ouverte. Tout flux Stripe actif doit être rapproché avant d’accorder l’accès offert ; aucune modification de facturation distante n’est automatique. Un ancien lien de paiement externe sans association au compte TaDiff ne suffit pas à activer sa compagnie.
