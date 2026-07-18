# Informations a completer avant publication des contrats TaDiff

Ce fichier regroupe toutes les decisions et informations qui ne peuvent pas etre inventees. Tant qu'une ligne est marquee `A COMPLETER`, les pages juridiques constituent une base de travail et ne doivent pas etre considerees comme definitives.

## 1. Exploitant actuel : ARKENCIEL Compagnie

Renseigner les informations exactement comme elles figurent au registre officiel et sur le compte bancaire qui recevra les paiements.

| Information | Valeur a fournir |
| --- | --- |
| Denomination exacte | ARKENCIEL Compagnie - confirmer la casse et l'orthographe |
| Forme juridique | A COMPLETER : association, SAS, autre |
| Adresse du siege | A COMPLETER |
| SIREN | A COMPLETER |
| RCS ou RNA | A COMPLETER |
| Capital social | A COMPLETER si societe |
| Numero de TVA | A COMPLETER ou indiquer "TVA non applicable, art. 293 B du CGI" si valide par le comptable |
| Representant legal | A COMPLETER |
| Directeur de publication | A COMPLETER |
| Telephone professionnel | A COMPLETER |
| Email juridique | contact@tadiff.com - A CONFIRMER |
| Email support | contact@tadiff.com - A CONFIRMER |
| Email facturation | contact@tadiff.com - A CONFIRMER |

## 2. Configuration Vercel

Ajouter ces variables dans Vercel, environnement Production, puis redeployer. Ne pas mettre de guillemets autour des valeurs.

```env
NEXT_PUBLIC_LEGAL_NAME=ARKENCIEL Compagnie
NEXT_PUBLIC_LEGAL_FORM=A COMPLETER
NEXT_PUBLIC_LEGAL_ADDRESS=A COMPLETER
NEXT_PUBLIC_LEGAL_REGISTRATION=A COMPLETER
NEXT_PUBLIC_LEGAL_VAT=A COMPLETER
NEXT_PUBLIC_LEGAL_DIRECTOR=A COMPLETER
NEXT_PUBLIC_PRIVACY_EMAIL=contact@tadiff.com
NEXT_PUBLIC_SUPPORT_EMAIL=contact@tadiff.com
NEXT_PUBLIC_BILLING_EMAIL=contact@tadiff.com
NEXT_PUBLIC_BETA_PRICE=19,99 EUR TTC par mois
NEXT_PUBLIC_LEGAL_VERSION=1.0
```

Quand la societe TaDiff reprend l'exploitation, remplacer les valeurs juridiques ARKENCIEL par celles de TaDiff, incrementer `NEXT_PUBLIC_LEGAL_VERSION`, conserver une copie de l'ancienne version et redeployer.

## 3. Decisions commerciales a valider

Les pages utilisent actuellement les hypotheses suivantes. Corriger ce fichier et les CGV si l'une d'elles est fausse.

- Cible contractuelle : professionnels, associations et compagnies agissant pour leur activite.
- Prix beta : `19,99 EUR TTC par mois`.
- Periodicite : mensuelle.
- Engagement minimum : aucun.
- Renouvellement : mensuel automatique.
- Resiliation : a tout moment, effective en fin de periode payee.
- Remboursement : pas de remboursement d'une periode commencee, sauf obligation legale, double paiement ou manquement justifie.
- Preavis avant hausse de prix : 30 jours.
- Support beta : email, sans delai garanti.
- Disponibilite beta : obligation de moyens, aucun SLA chiffre.
- Recuperation apres resiliation : 30 jours.
- Plafond de responsabilite propose : montants HT verses au cours des 12 derniers mois, avec les exceptions legales.

Questions a trancher :

- Le prix de 19,99 EUR est-il HT ou TTC ?
- ARKENCIEL facture-t-elle la TVA ?
- Le tarif beta est-il conserve apres la beta, et pendant combien de temps ?
- Quelles limites sont incluses : utilisateurs, spectacles, stockage, emails ?
- Le client peut-il resilier directement dans l'application des le lancement ?
- Quelle adresse doit recevoir les reclamations urgentes ?
- Souhaitez-vous une assurance responsabilite civile professionnelle specifique au SaaS ?

## 4. Donnees et infrastructure a documenter

| Prestataire | Usage | Information manquante |
| --- | --- | --- |
| Supabase | Auth, base de donnees, stockage | Region du projet, DPA accepte, sauvegardes et cycle de suppression |
| Vercel | Hebergement web | DPA accepte, region et journaux techniques |
| Stripe | Paiement | Compte au nom de l'exploitant, TVA, factures, DPA |
| Service email | Emails transactionnels et campagnes | Prestataire definitif, pays, DPA, desinscription |
| William / IA | Assistance future | Fournisseur, modele, pays, conservation, entrainement, cout et consentement |

Il faut etablir et maintenir la liste des sous-traitants. Toute nouvelle integration qui recoit des donnees client doit etre ajoutee avant sa mise en production.

## 5. Transition ARKENCIEL vers TaDiff

Avant le transfert :

1. Constituer la societe TaDiff et obtenir ses informations officielles.
2. Formaliser entre ARKENCIEL et TaDiff la cession ou l'apport des contrats, du nom de domaine, des comptes techniques, de la marque et des droits necessaires sur le logiciel.
3. Definir qui reste responsable des dettes, incidents, factures et reclamations anterieurs au transfert.
4. Informer les clients de l'identite de TaDiff, de la date du transfert et des nouvelles coordonnees.
5. Ne pas changer silencieusement le prix, les usages de donnees ou les droits acquis.
6. Faire accepter une nouvelle version si le transfert s'accompagne d'un changement substantiel.
7. Mettre Stripe, Vercel, Supabase, le domaine et les emails au nom de la bonne entite.
8. Conserver la preuve des versions contractuelles acceptees avant et apres le transfert.

## 6. Acceptation a implementer dans le produit

Avant le premier paiement, ajouter une case obligatoire et non pre-cochee :

> J'ai lu et j'accepte les Conditions generales d'utilisation et les Conditions generales de vente de TaDiff.

Conserver en base :

- identifiant utilisateur ;
- identifiant compagnie ;
- version des CGU ;
- version des CGV ;
- date et heure UTC ;
- methode d'acceptation ;
- adresse IP avec une conservation limitee ;
- copie immuable ou empreinte du document accepte.

Une case distincte doit etre utilisee pour une prospection commerciale facultative. L'acceptation des contrats et le consentement marketing ne doivent pas etre fusionnes.

## 7. Documents a faire relire

- `/cgu` : regles d'utilisation.
- `/cgv` : abonnement et paiement.
- `/annexe-rgpd` : traitement des donnees des compagnies.
- `/confidentialite` : donnees gerees directement par TaDiff.
- `/cookies` : traceurs.
- `/mentions-legales` : identite de l'editeur.

La relecture doit verifier en particulier le statut des compagnies clientes, le regime de TVA d'ARKENCIEL, la clause de transfert vers TaDiff, le plafond de responsabilite, la juridiction competente et les modalites de resiliation.

## 8. Publication et preuve

- Faire figurer une date et un numero de version sur chaque document.
- Archiver chaque version publiee en PDF ou HTML non modifiable.
- Ne jamais remplacer une ancienne version sans l'archiver.
- Enregistrer la version acceptee par chaque client.
- Envoyer les CGU/CGV acceptees avec la confirmation de commande ou rendre leur telechargement permanent.
- Prevenir avant toute modification importante et demander une nouvelle acceptation lorsqu'elle est necessaire.

## 9. Avertissement

Ces pages sont une base contractuelle adaptee au fonctionnement actuel de TaDiff. Elles doivent etre relues par un avocat ou juriste connaissant les contrats SaaS, le droit des associations et le spectacle vivant avant le premier encaissement reel.
