# Parcours d'acces a la beta TaDiff

Derniere mise a jour : 3 aout 2026.

Ce protocole privilegie un lancement simple et controlable pour une cohorte de 10 a 30 compagnies. Il evite de creer un compte TaDiff avant que le paiement soit confirme.

## Parcours recommande

1. TaDiff selectionne une compagnie inscrite a la beta.
2. TaDiff lui envoie le mail d'ouverture avec le lien de paiement Stripe.
3. La compagnie paie 19,99 EUR TTC pour le premier mois.
4. Stripe confirme le paiement.
5. TaDiff envoie l'invitation Supabase a l'adresse ayant paye.
6. La personne choisit son mot de passe et renseigne sa compagnie dans le parcours de bienvenue.
7. Elle arrive dans le cockpit et suit la visite guidee.

Si le mail de paiement a ete envoye depuis une messagerie personnelle, selectionner la compagnie dans `/admin/beta`, puis cliquer sur `Mails deja envoyes manuellement`. Cette action enregistre l'etape sans renvoyer de message et rend disponible la verification du paiement.

Pour la petite cohorte beta, les etapes 4 et 5 peuvent etre traitees manuellement une fois par jour. Cette solution est plus facile a verifier qu'une automatisation prematuree et empeche qu'un compte impaye obtienne un acces.

Apres la creation effective de l'espace, verifier la compagnie dans le super-admin et passer son statut de facturation a `Actif` avec une note contenant la reference Stripe. Le lien de paiement externe ne connait pas encore l'identifiant de la compagnie TaDiff et ne peut donc pas effectuer seul cette association.

## Configuration Stripe minimale

### Offre a ouvrir en premier

- Produit : `TaDiff - Beta testeurs`.
- Prix : `19,99 EUR TTC`.
- Paiement : unique pour le premier mois de beta.
- Renouvellement automatique : non.
- Poursuite : nouvelle proposition et accord explicite avant toute facturation supplementaire.
- Moyen de paiement : carte bancaire.

Creer un lien de paiement Stripe pour ce prix. Apres paiement, rediriger vers une page TaDiff de confirmation ou, tant qu'elle n'existe pas, afficher le message Stripe suivant :

> Paiement confirme. Votre invitation personnelle TaDiff vous sera envoyee a cette adresse email dans un delai maximal d'un jour ouvre.

Ne pas ouvrir publiquement l'offre `99 EUR pour six mois` tant que ses conditions et son eventuelle poursuite n'ont pas ete validees. Le lien actuel sert uniquement au premier mois de beta.

### Variables de l'application

L'integration Stripe deja presente dans TaDiff utilise :

```env
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://tadiff.com
BETA_PAYMENT_LINK_URL=https://buy.stripe.com/...
```

Le lien de Tony est externe au compte TaDiff et ne contient pas l'identifiant de la future compagnie. Pour cette cohorte, vérifier le paiement dans Stripe puis le confirmer manuellement dans `/admin/beta`. Le webhook d'abonnement et les prix récurrents seront configurés dans un chantier ultérieur.

Avant l'envoi réel, vérifier avec une adresse interne : paiement accepté, paiement refusé, reçu Stripe et absence d'abonnement créé.

## Envoi de l'acces Supabase

Apres verification du paiement, utiliser la commande TaDiff :

```powershell
npm run beta:invite -- "email@compagnie.fr" "Prenom Nom" "Nom de la compagnie"
```

La commande envoie l'invitation avec le bon retour vers le choix du mot de passe puis `/welcome`. Elle lit la cle secrete uniquement depuis l'environnement serveur local.

Pour une invitation exceptionnelle depuis le Dashboard :

1. Ouvrir Supabase > Authentication > Users.
2. Choisir `Add user`, puis `Send invitation`.
3. Utiliser exactement l'adresse email du paiement Stripe.
4. Preferer la commande ci-dessus pour garantir le retour vers le choix du mot de passe puis `/welcome`.
5. Verifier que `https://tadiff.com/auth/callback` et `https://tadiff.com/welcome` figurent dans les URLs de redirection autorisees.
6. Personnaliser le modele `Invite user` avec le nom TaDiff et une formulation francaise.
7. Dans ce modele, utiliser ce lien afin que la session soit creee cote serveur avant le choix du mot de passe :

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">
  Creer mon acces TaDiff
</a>
```

Ne pas activer le suivi ou la reecriture des liens sur les emails d'authentification. Certains outils de messagerie peuvent sinon consommer ou modifier le lien a usage unique.

L'invitation est une action d'administration. La cle Supabase secrete ne doit jamais etre placee dans le navigateur ou dans un lien envoye au client.

## Mail d'ouverture pret a envoyer

Configurer le lien Stripe public dans l'environnement local, puis envoyer un mail personnalise :

```powershell
$env:BETA_PAYMENT_LINK_URL="https://buy.stripe.com/14A3cvaEV7YegtmdCS4Jc3M"
npm run beta:email -- "email@compagnie.fr" "Prenom" "Nom de la compagnie"
```

La commande exige aussi `RESEND_API_KEY`. Elle n'envoie rien si l'adresse, la cle ou le lien HTTPS manque. Conserver le lien dans une variable permet de le remplacer sans modifier le code si Tony regenere le Payment Link.

Objet : `Votre acces a la beta TaDiff est pret`

```text
Bonjour [Prenom],

La beta TaDiff ouvre ses portes et la place de [Compagnie] est confirmee.

TaDiff va vous permettre de reunir vos spectacles, contacts, dates, dossiers, financements et priorites dans un meme cockpit. William vous accompagnera pendant la prise en main.

Pour activer votre acces :

1. Reglez votre premier mois de beta, a 19,99 EUR TTC, avec le lien securise ci-dessous.
2. Utilisez la meme adresse email que celle de votre inscription.
3. Apres confirmation du paiement, vous recevrez votre invitation personnelle TaDiff dans un delai maximal d'un jour ouvre.
4. Choisissez votre mot de passe, renseignez votre compagnie et suivez la visite guidee.

[Regler et activer mon acces]

Ce paiement couvre uniquement votre premier mois de beta. Aucun renouvellement automatique ne sera effectue. Les conditions de poursuite vous seront presentees separement avant toute nouvelle facturation.

Avant de commencer, vous pouvez preparer :
- le logo de votre compagnie ;
- le nom d'un premier spectacle ;
- quelques contacts ou un fichier Excel de contacts ;
- vos prochaines dates et echeances importantes.

En cas de question ou de blocage, repondez simplement a cet email ou ecrivez a support@tadiff.com.

A tres bientot,
L'equipe TaDiff
```

Le bouton doit utiliser le lien de paiement Stripe, jamais une URL contenant une cle ou un secret.

## Script explicatif court

Duree cible : 1 minute 30 a 2 minutes.

### 0:00 - Bienvenue

> Bienvenue dans la beta TaDiff. TaDiff est le cockpit des compagnies du spectacle vivant : vos spectacles, contacts, dates, dossiers et priorites sont reunis au meme endroit.

### 0:15 - Paiement et invitation

> Pour ouvrir votre espace, commencez par le lien de paiement securise recu dans cet email. Utilisez la meme adresse email que lors de votre inscription. Une fois le paiement confirme, vous recevrez votre invitation personnelle.

### 0:35 - Creation de l'espace

> Cliquez sur l'invitation, choisissez votre mot de passe, puis indiquez votre nom et celui de votre compagnie. Vous pouvez ajouter votre logo maintenant ou le faire plus tard.

### 0:55 - Premier spectacle

> William vous accueille ensuite dans le cockpit. Commencez par creer un spectacle, puis ajoutez quelques contacts et une prochaine action. Inutile de tout importer le premier jour.

### 1:15 - Accompagnement

> Pendant la beta, vos retours sont essentiels. Utilisez le bouton Donner un retour ou ecrivez a support@tadiff.com des qu'une etape vous semble difficile ou peu claire.

### 1:35 - Conclusion

> Votre espace reste celui de votre compagnie. Les donnees sont separees des autres compagnies, et William ne realise pas d'action sensible sans votre confirmation. Bienvenue dans TaDiff.

## Rejouer le parcours

### Relecture visuelle rapide

Le compte `demo_webinaire` peut ouvrir `/demo-signup`. Ce parcours remet a zero l'espace de demonstration, simule la creation du compte, rejoue `/welcome`, puis relance la visite du cockpit.

Cette methode verifie l'experience visuelle, mais elle ne cree pas un nouvel utilisateur Supabase et ne declenche pas de vrai paiement Stripe.

### Test technique complet

Utiliser une adresse email de test distincte :

1. Utiliser une adresse interne avec le lien Stripe de Tony.
2. Effectuer un paiement réel contrôlé, puis conserver son reçu.
3. Vérifier le paiement dans le Dashboard Stripe et confirmer manuellement l'inscription dans `/admin/beta`.
4. Envoyer une invitation Supabase a l'adresse de test.
5. Ouvrir le lien dans une fenetre privee.
6. Choisir le mot de passe et terminer `/welcome`.
7. Verifier que la compagnie creee ne peut lire aucune donnee d'une autre compagnie.
8. Tester connexion, déconnexion et mot de passe oublié.
9. Supprimer ensuite uniquement l'utilisateur et la compagnie de test identifies, sans reutiliser une adresse client reelle.

## Controle quotidien pendant le lancement

Tenir un tableau simple avec :

- compagnie ;
- contact et email ;
- mail d'ouverture envoye ;
- paiement confirme ;
- invitation envoyee ;
- compte active ;
- premier spectacle cree ;
- probleme rencontre ;
- relance necessaire.

Ne jamais marquer un accès comme actif sur la seule base du retour navigateur après Checkout. Pour cette cohorte, la confirmation doit être vérifiée dans le Dashboard Stripe.
