# TaDiff - Developpement produit

Derniere mise a jour : 2026-07-04  
Contexte : retour de reunion avec le directeur. Contrat en cours de redaction, objectif possible de 30% pour le role technique/produit.

## 1. Vision

TaDiff doit devenir le cockpit de pilotage d'une compagnie de spectacle vivant.

La question centrale a laquelle le produit doit repondre :

> Pourquoi les compagnies ferment, et qu'est-ce qu'on peut faire aujourd'hui pour eviter ca ?

Le produit ne doit pas seulement stocker des donnees. Il doit remplacer une partie de l'administration de production :

- savoir quoi faire maintenant ;
- ne pas rater les dates importantes ;
- comprendre la tresorerie sans etre comptable ;
- suivre les spectacles, les contacts, les devis, les contrats et les subventions ;
- aider la compagnie a vendre, financer et administrer ses spectacles.

La cible prioritaire est la compagnie. Les autres cibles possibles, comme bureaux de production, artistes, lieux ou festivals, viennent apres.

## 2. Principes produit

- Simplicite type Apple : tres peu de friction, beaucoup de clarte.
- Simplicite type Finary/Pennylane : l'utilisateur connecte ou renseigne peu de choses, le cockpit fait le reste.
- Pas de jargon inutile : parler en langage de compagnie, pas en langage SaaS.
- La difficulte ne doit pas se voir.
- Le produit accompagne, mais ne prend pas tout a la main.
- Chaque ecran doit repondre a une action concrete : quoi faire, quoi surveiller, quoi relancer, quoi deposer, quoi signer.
- Priorite aux alertes et aux prochaines actions, pas aux tableaux complexes.
- Le design bleu est accepte, mais attention a l'effet "startup nation". Il faut une identite plus culturelle, humaine, premium et accessible.

## 3. Planning cible

### 23 juillet 2026 - Demo

Objectif : montrer un produit coherent, comprehensible, qui donne envie a une compagnie de l'utiliser.

Fonctionnalites a privilegier pour la demo :

- page d'inscription beta avec 10 premieres places + liste d'attente de 30 ;
- cockpit lisible avec tresorerie, alertes, prochaines actions et risques ;
- spectacles avec affiche et documents lies ;
- radar subventions avec checklist de pieces et bouton de telechargement en .zip ;
- finance simple avec tresorerie actuelle, frais fixes, projection et seuil de danger ;
- calendrier type Google Agenda avec dates de subventions et frais fixes ;
- CRM/pipeline avec relances et emails personnalises ;
- devis avec integration des frais fixes ;
- contrats avec templates visibles ;
- Stripe en mode test ;
- donnees de demo realistes pour une compagnie.

### 6 aout 2026 - Beta

Objectif : beta test avec 10 compagnies a 19,99 EUR.

A mettre en place :

- inscription limitee a 10 places ;
- liste d'attente pour les 30 suivants ;
- formulaire de retour au milieu de la periode ;
- formulaire de retour en fin de periode ;
- suivi des problemes rencontres ;
- canal de support simple.

### 6 septembre 2026 - Lancement officiel

Objectif : premiere version vendable.

Avoir au minimum :

- parcours d'inscription propre ;
- paiement Stripe en production ;
- espace compagnie stable ;
- donnees persistantes ;
- subventions/mecenat exploitables ;
- finance utile ;
- CRM utilisable ;
- export documents ;
- templates principaux ;
- politique de confidentialite, CGU/CGV, mentions legales.

### 20 septembre 2026 - William IA

Objectif : premiere version de William, assistant IA de TaDiff.

William ne doit pas etre un gadget. Il doit aider a :

- comprendre quoi faire ensuite ;
- retrouver une subvention adaptee ;
- aider a remplir un dossier ;
- expliquer la tresorerie ;
- transformer une demande orale ou ecrite en action ;
- resumer les documents d'un spectacle ;
- preparer des emails personnalises.

## 4. Etat produit actuel

Base deja en place cote application :

- structure Next.js App Router ;
- pages publiques, tarifs, login/signup ;
- cockpit/dashboard ;
- spectacles ;
- contacts ;
- pipeline ;
- relances ;
- calendrier ;
- contrats ;
- finances ;
- documents ;
- parametres ;
- couche Supabase prete avec fallback mock ;
- heartbeat Supabase via GitHub Actions ;
- premiers flux en cours : import CSV contacts, creation de devis depuis le pipeline, export workspace, page devis imprimable.

Important : garder le principe actuel de vues coherentes derivees du meme graphe de donnees : compagnie, spectacle, contact, opportunite, relance, document, contrat, finance.

## 5. Modules a construire

### Cockpit

Le cockpit doit etre l'ecran principal.

Il doit montrer :

- etat de tresorerie : vert, orange, rouge ;
- argent disponible maintenant ;
- projection a 30, 60, 90 jours ;
- date estimee ou la compagnie passe dans le rouge ;
- prochaines subventions a deposer ;
- contrats a signer ;
- devis a relancer ;
- factures a encaisser ;
- frais fixes a venir ;
- documents manquants ;
- actions recommandees.

Exemples de messages :

- "Tu es bon jusqu'au 14 octobre si rien ne change."
- "Attention, cette subvention ferme dans 12 jours."
- "Ce devis de 3 200 EUR n'a pas ete relance depuis 9 jours."
- "Bravo, tu as obtenu une subvention de 8 000 EUR."

### Spectacles

Chaque spectacle doit pouvoir contenir :

- affiche ;
- titre ;
- equipe ;
- distribution ;
- discipline ;
- duree ;
- jauge ;
- prix de vente ;
- cout de cession ;
- cout de creation ;
- cout de tournee ;
- synopsis ;
- note d'intention ;
- texte ;
- dossier artistique ;
- fiche technique ;
- devis ;
- contrats ;
- budget ;
- photos ;
- liens video, avec captations hebergees plutot sur YouTube/Vimeo par la compagnie.

Objectif : le spectacle devient le dossier central reutilisable pour vendre, subventionner, contractualiser et piloter.

### Documents et dossiers de subvention

Pour chaque spectacle, stocker les documents utiles aux dossiers :

- note d'intention ;
- synopsis ;
- texte ;
- dossier artistique ;
- budget previsionnel ;
- devis ;
- RIB ;
- statuts ;
- attestation SIRET ;
- licences ;
- bilans ;
- contrats ;
- visuels ;
- CV ;
- pieces administratives recurrentes.

Quand une subvention est detectee, TaDiff doit indiquer :

- pieces necessaires ;
- pieces deja presentes ;
- pieces manquantes ;
- date limite ;
- criteres d'eligibilite ;
- montant possible ;
- lien officiel ;
- niveau de compatibilite avec le spectacle.

Bouton cible :

- "Telecharger le dossier .zip"

Ce .zip doit contenir toutes les pieces deja disponibles pour simplifier le depot.

### Subventions

Le radar subventions doit etre une base structuree, pas une simple liste.

Champs a prevoir :

- nom du dispositif ;
- organisme ;
- type : creation, diffusion, emploi, international, festival, residence, fonctionnement ;
- discipline ;
- region/pays ;
- date limite ;
- date de commission ;
- montant minimum/maximum ;
- delai d'instruction ;
- eligibilite ;
- pieces demandees ;
- lien officiel ;
- source ;
- statut : a surveiller, eligible, a preparer, deposee, obtenue, refusee.

Sources initiales a integrer ou surveiller :

- CNM ;
- DRAC / Ministere de la Culture ;
- Adami ;
- Spedidam ;
- SACD / Beaumarchais ;
- regions ;
- departements ;
- villes ;
- Institut francais ;
- Europe Creative ;
- fondations privees.

Quelques reperes verifies au 2026-07-04 :

- CNM production/diffusion spectacle vivant : dates limites 26 aout 2026 et 7 octobre 2026 ; prevoir 8 semaines d'analyse et affiliation a anticiper d'au moins 20 jours ouvres.
- Adami : aides aux structures employant des artistes, avec aide simplifiee possible et plafond mentionne de 20 000 EUR selon dispositif.
- SPEDIDAM : calendrier de commissions a suivre depuis leur page officielle.
- Ministere de la Culture : les calendriers varient selon les regions et dispositifs.

Sources :

- https://cnm.fr/aides-financieres/aide-a-la-production-et-a-la-diffusion-de-spectacle-vivant/
- https://www.adami.fr/suis-porteurde-projet/les-aides/
- https://www.adami.fr/suis-porteurde-projet/les-commissions/
- https://www.spedidam.fr/aides-aux-projets/calendrier-des-commissions/
- https://www.culture.gouv.fr/catalogue-des-demarches-et-subventions/subvention/aide-au-projet-ou-au-fonctionnement-spectacle-vivant-et-arts-visuels

### Mecenat

Separer subventions et mecenat.

Le mecenat a une logique differente :

- entreprises ;
- fondations ;
- appels a projets ;
- themes ;
- territoire ;
- contreparties ;
- calendrier ;
- niveau de compatibilite ;
- contacts a activer ;
- dossier de presentation.

Il faut donner un cote plus ludique a la recherche :

- cartes de dispositifs ;
- badges de compatibilite ;
- filtres simples ;
- "opportunites chaudes" ;
- bouton pour voir les pieces demandees.

### Finance

Objectif : donner les chiffres utiles sans faire peur.

Indicateurs a afficher simplement :

- tresorerie actuelle ;
- tresorerie projetee ;
- burn mensuel ;
- frais fixes mensuels ;
- frais variables ;
- recettes attendues ;
- factures/devis a encaisser ;
- subventions attendues ;
- cout de creation deja engage ;
- rentabilite par spectacle ;
- prix minimum viable par cession ;
- marge par date ;
- mois ou la tresorerie devient negative ;
- actions conseillees.

Ne pas afficher d'abord des tableaux comptables. Afficher d'abord des phrases comprehensibles :

- "Il te manque 2 dates vendues pour couvrir les frais fixes du trimestre."
- "Ton spectacle devient rentable a partir de 6 cessions a 2 800 EUR."
- "Tes frais fixes representent 740 EUR par mois."
- "Si rien ne rentre, tu passes dans le rouge le 18 novembre."

Les frais fixes a integrer :

- assurance ;
- banque ;
- comptable ;
- stockage materiel ;
- logiciel ;
- locaux ;
- abonnements ;
- salaires fixes ;
- communication recurrente ;
- remboursement de pret ;
- charges recurrentes.

Ces couts doivent pouvoir etre lisses dans :

- les devis ;
- le prix de cession ;
- la rentabilite d'un spectacle ;
- la projection de tresorerie.

### Connexion bancaire

Connecter un compte bancaire est faisable, mais il ne faut pas l'implementer banque par banque.

Approche recommandee :

1. MVP : import CSV bancaire + saisie simple des frais fixes.
2. V1 : connexion bancaire via un agregateur Open Banking/DSP2.
3. V2 : categorisation automatique + rapprochement avec devis, factures, subventions et frais fixes.

Prestataires a etudier pour la France/Europe :

- Bridge API : open banking, paiement, donnees, rapprochement bancaire.
- Powens : comptes, transactions, paiements DSP2.
- Tink : plateforme europeenne d'open banking.
- Plaid : possible en Europe mais couverture a verifier par banque et pays.

Sources :

- https://www.bridgeapi.io/
- https://docs.bridgeapi.io/docs/quickstart
- https://docs.powens.com/
- https://tink.com/fr/
- https://plaid.com/docs/institutions/europe/

Point important : cette brique a un cout, une complexite RGPD et une contrainte de consentement utilisateur. Pour la demo du 23 juillet, il vaut mieux montrer le flux avec donnees de demo et import CSV.

### Devis

Les devis doivent integrer :

- prix de cession ;
- frais de transport ;
- hebergement ;
- repas ;
- technique ;
- marge ;
- TVA si applicable ;
- couts fixes lisses ;
- couts de creation a amortir ;
- acompte ;
- solde ;
- conditions.

Objectif : aider une compagnie a ne pas vendre a perte.

### Contrats

Templates a prevoir :

- contrat de cession ;
- contrat d'embauche ;
- contrat de prestation de service ;
- contrat d'exploitation ;
- convention de residence ;
- convention de coproduction ;
- avenant ;
- facture ou note de debit selon modele retenu.

Ces templates doivent etre valides juridiquement avant usage commercial.

### Calendrier

Calendrier type Google Agenda.

Doit afficher :

- dates de representation ;
- dates de creation/residence ;
- relances CRM ;
- dates limites de subventions ;
- dates de commission ;
- dates de depot mecenat ;
- echeances contrats ;
- echeances factures ;
- frais fixes ;
- dates bancaires recurrentes ;
- jalons beta/produit.

Vue cible :

- mois ;
- semaine ;
- liste "a faire" ;
- filtres : spectacle, finance, subventions, CRM, contrats.

### CRM et prospection

Le CRM doit travailler pour la compagnie.

Objectifs :

- importer des contacts ;
- classer automatiquement ;
- proposer une relance ;
- generer un email personnalise ;
- eviter les emails clones ;
- suivre les reponses ;
- lier chaque contact a un spectacle et a une opportunite.

Sources de contacts possibles :

- base programmateurs Avignon si disponible/legalement exploitable ;
- annuaires publics ;
- contacts importes par l'utilisateur ;
- fichiers CSV de la compagnie.

Attention : respecter RGPD, opt-out, source du contact et conditions d'utilisation des bases.

Pour les emails automatises :

- ne pas envoyer 200 fois le meme mail ;
- creer des variantes ;
- personnaliser par lieu, discipline, historique, ville, spectacle ;
- garder un ton humain ;
- laisser l'utilisateur valider avant envoi au debut.

### Tutoriels et onboarding

Le produit doit prendre l'utilisateur par la main au debut.

Parcours initial :

1. Creer la compagnie.
2. Ajouter un spectacle.
3. Ajouter les documents essentiels.
4. Ajouter les frais fixes.
5. Importer ou ajouter quelques contacts.
6. Voir la tresorerie simple.
7. Voir les prochaines subventions.
8. Envoyer ou preparer une premiere relance.

Format :

- checklist ;
- tutoriels courts ;
- boutons d'action ;
- exemples pre-remplis ;
- explications contextuelles ;
- pas de gros guide de documentation au premier usage.

### William IA

William est l'assistant IA de TaDiff.

Image possible :

- petit compagnon visuel anime ;
- pas trop enfantin ;
- proche d'un assistant premium : ChatGPT, Claude, Gemini, mais avec une identite spectacle vivant.

Fonctions futures :

- repondre aux questions de la compagnie ;
- expliquer la tresorerie ;
- suggerer quoi faire ensuite ;
- chercher les subventions adaptees ;
- aider a remplir les dossiers ;
- resumer les pieces du spectacle ;
- transformer une dictee en action ;
- ajouter un contact ;
- creer un spectacle ;
- preparer un email ;
- generer une checklist de depot.

Architecture IA recommandee :

- RAG sur les documents de la compagnie ;
- RAG sur la base subventions/mecenat ;
- outils/actions internes controles ;
- modele economique par quotas pour eviter les couts non maitrises ;
- petit modele pour les actions simples ;
- modele plus fort pour les dossiers complexes ;
- logs et validation utilisateur avant action sensible.

Modeles a etudier :

- DeepSeek pour cout bas ;
- Mistral pour option europeenne ;
- OpenAI pour qualite et ecosysteme ;
- Claude pour raisonnement/documentation si le cout est acceptable.

Sources de prix a surveiller :

- https://api-docs.deepseek.com/quick_start/pricing-details-usd/
- https://mistral.ai/pricing/api/
- https://developers.openai.com/api/docs/pricing
- https://platform.claude.com/docs/en/about-claude/pricing

Regle : ne pas lancer William en production sans budget mensuel, limites par utilisateur, consentement sur les documents, et controle des actions.

## 6. Stockage

Hypothese cible : 200 compagnies, 5 spectacles chacune, soit 1 000 spectacles.

La captation video complete devrait rester hebergee chez la compagnie, par exemple YouTube/Vimeo en lien prive, pour eviter d'exploser les couts de stockage et de streaming.

Stocker dans TaDiff :

- affiches ;
- PDF ;
- docs ;
- photos utiles ;
- budgets ;
- contrats ;
- pieces administratives.

Options :

### Cloudflare R2

Avantages :

- cout tres bas ;
- egress gratuit ;
- compatible S3 ;
- bon choix pour documents et zips.

Prix repere : 10 Go gratuits puis environ 0,015 USD / Go / mois sur le stockage standard.

Source : https://developers.cloudflare.com/r2/pricing/

### Supabase Storage

Avantages :

- integration simple avec auth et base Supabase ;
- bon pour MVP ;
- RLS et gestion utilisateur coherentes.

Prix repere : Pro inclut 100 Go, depassement a 0,0213 USD / Go.

Source : https://supabase.com/docs/guides/storage/pricing

### Backblaze B2

Avantages :

- tres economique ;
- compatible S3 ;
- egress gratuit jusqu'a 3x le stockage moyen mensuel, puis cout bas.

Prix repere public : environ 6,95 USD / To / mois sur leur comparatif.

Source : https://www.backblaze.com/cloud-storage/pricing

### Wasabi

Avantages :

- stockage objet S3-compatible ;
- prix simple au To ;
- option credible si "wooza" voulait dire Wasabi ;
- interessant pour archives/documents si le modele de facturation convient.

Prix repere : a partir de 7,99 USD / To / mois selon la page officielle 2026.

Source : https://wasabi.com/pricing

### Recommandation

Pour la demo et la beta :

- Supabase Storage si on veut aller vite et rester simple ;
- Cloudflare R2 si on veut optimiser le cout et separer proprement fichiers/base.
- Wasabi ou Backblaze B2 peuvent etre compares si on veut un stockage S3-compatible tres lisible au To.

Pour 1 000 spectacles :

- 250 Mo / spectacle = 250 Go environ ;
- 1 Go / spectacle = 1 To environ ;
- sans video, le cout stockage brut reste faible.

Le vrai sujet n'est pas seulement le prix : il faut gerer droits d'acces, suppression, exports, sauvegardes, confidentialite et zips.

## 7. Paiement et revenus

Stripe est a configurer avant la beta.

Sources :

- Paiement Stripe France : https://stripe.com/fr/pricing
- Stripe Billing : https://stripe.com/en-fr/billing/pricing

Reperes verifies au 2026-07-04 :

- cartes standard EEE : 1,5% + 0,25 EUR par transaction ;
- Stripe Billing pay-as-you-go : 0,7% du volume Billing.

Scenarios a 200 compagnies :

- beta 19,99 EUR : 200 clients = 3 998 EUR MRR ;
- Solo 49 EUR : 200 clients = 9 800 EUR MRR ;
- Pro 99 EUR : 200 clients = 19 800 EUR MRR ;
- Studio 199 EUR : 200 clients = 39 800 EUR MRR ;
- mix 60% Solo, 30% Pro, 10% Studio = 15 800 EUR MRR, soit 189 600 EUR ARR.

Beta du 6 aout :

- 10 compagnies a 19,99 EUR = 199,90 EUR MRR.

La beta ne sert pas a gagner beaucoup d'argent. Elle sert a valider :

- comprehension ;
- utilite ;
- recurrence ;
- disposition a payer ;
- priorites produit ;
- bugs bloquants.

## 8. Infrastructure previsionnelle

Sources principales :

- Vercel Pro : https://vercel.com/docs/plans/pro-plan
- Supabase pricing : https://supabase.com/pricing
- Resend pricing : https://resend.com/pricing
- Cloudflare R2 : https://developers.cloudflare.com/r2/pricing/
- Stripe France : https://stripe.com/fr/pricing

Ordres de grandeur :

### Demo / beta

- Vercel : 20 USD / mois minimum en Pro si usage commercial ;
- Supabase : 25 USD / mois en Pro ;
- email : gratuit ou 20 USD / mois selon volume ;
- stockage : faible ;
- Stripe : frais par transaction.

Budget prudent : 50 a 150 USD / mois hors frais de paiement.

### 200 compagnies

Budget infra prudent :

- Vercel : 20 a 100 USD / mois selon trafic et seats ;
- Supabase : 25 a 150 USD / mois selon compute et volume ;
- email : 20 a 90 USD / mois selon volume ;
- stockage : 5 a 50 USD / mois sans video ;
- monitoring/logs : 0 a 50 USD / mois au debut.

Budget total probable : 100 a 500 USD / mois hors frais Stripe, puis plus si IA, gros volume email ou usage intensif.

Les frais de paiement et l'IA peuvent depasser l'infra classique.

## 9. Ressources a demander / collecter

### Acces techniques

- Vercel ;
- Supabase ;
- Stripe ;
- Resend ou equivalent email ;
- domaine/DNS ;
- GitHub ;
- outil analytics ;
- compte Cloudflare si R2 retenu ;
- eventuel compte Bridge/Powens/Tink pour banque.

### Ressources produit

- logo ;
- charte graphique ;
- ton de marque ;
- idee visuelle de William ;
- captures d'outils references : Finary, Pennylane, Apple, Google Agenda ;
- exemples reels de compagnies ;
- dossiers types ;
- liste des douleurs administratives principales.

### Ressources metier

- templates de contrats ;
- modeles de devis ;
- modeles de factures ;
- budgets de creation ;
- budgets de tournee ;
- liste de frais fixes typiques ;
- documents de subventions deja deposes ;
- exemples de dossiers acceptes/refuses ;
- grille de pieces justificatives ;
- sources officielles de subventions.

### Ressources commerciales

- 10 compagnies beta ;
- 30 compagnies liste d'attente ;
- base de contacts Avignon si exploitable ;
- liste de programmateurs ;
- liste de lieux ;
- liste de festivals ;
- contacts bureaux de production ;
- contacts institutions ;
- templates emails ;
- script de demo ;
- formulaire de retour beta.

### Ressources legales

- contrat d'association/fondateur ;
- cession ou licence du code ;
- pacte d'associes ;
- CGU ;
- CGV ;
- politique de confidentialite ;
- DPA/RGPD ;
- mentions legales ;
- validation juridique des templates de contrats ;
- conditions d'utilisation des bases de contacts.

## 10. Questions a trancher rapidement

- Le produit est-il d'abord finance, diffusion, subventions, ou cockpit global ?
- Quel est le prix public au lancement officiel ?
- La beta a 19,99 EUR donne-t-elle un prix garanti ensuite ou seulement un tarif beta ?
- Qui fournit les templates juridiques ?
- Qui valide les subventions et leurs pieces ?
- Qui maintient la base subventions/mecenat ?
- Est-ce qu'on fait d'abord import CSV bancaire ou connexion bancaire ?
- Supabase Storage ou Cloudflare R2 pour les documents ?
- William est-il inclus dans l'abonnement ou facture a part ?
- Quelle limite d'usage IA par compagnie ?
- Qui est responsable support client pendant la beta ?
- Quelle promesse marketing exacte : "remplacer une administration de production" est forte, donc il faut cadrer.

## 11. Priorites immediates avant le 23 juillet

1. Page beta : 10 places + liste d'attente 30.
2. Cockpit demo : tresorerie, alertes, prochaines actions.
3. Spectacle : affiche + documents.
4. Radar subventions : 10 dispositifs bien renseignes.
5. Export .zip des pieces d'un dossier.
6. Finance : frais fixes + projection tresorerie.
7. Calendrier : subventions + frais fixes + relances.
8. CRM : import contacts + relance personnalisee.
9. Devis : prix avec frais fixes lisses.
10. Contrats : galerie de templates.
11. Stripe test.
12. Donnees demo realistes.

## 12. Phrase produit de travail

TaDiff est le cockpit qui aide une compagnie a piloter ses spectacles, sa diffusion, ses subventions, ses contrats et sa tresorerie sans subir l'administration.

Alternative plus directe :

TaDiff aide les compagnies a ne plus rater les bonnes dates, les bons contacts et les bons financements.

## 13. Point de vigilance

L'ambition est forte. Pour tenir les delais, il faut eviter de construire une suite complete tout de suite.

Pour le 23 juillet, il faut une demo qui raconte parfaitement le produit :

- je comprends ma situation ;
- je vois les risques ;
- je sais quoi faire ;
- je prepare mes dossiers ;
- je relance mes contacts ;
- je ne vends pas a perte ;
- je garde mes documents au bon endroit.

La profondeur viendra ensuite.
