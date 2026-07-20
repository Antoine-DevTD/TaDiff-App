# Parcours demo UX - TaDiff

Objectif : montrer en 8 a 12 minutes que TaDiff est un cockpit simple pour une compagnie, pas une maquette SaaS.

## Regle de demo

- Toujours partir de la question : "qu'est-ce que je dois faire maintenant pour que ma compagnie tienne ?"
- Eviter le jargon : dire carnet, diffusion, tresorerie, dossiers, aides.
- Ne pas vendre Stripe, Resend ou William IA comme actifs tant que les cles et tests reels ne sont pas faits.
- Montrer les donnees demo comme une vraie compagnie : Compagnie de l'Estran.

## Preparation avant appel

1. Verifier que les migrations Supabase sont appliquees jusqu'a `024_contact_tags.sql`.
2. Sur un compte vierge, aller dans `Parametres` puis lancer "Installer la compagnie de demonstration".
3. Recharger le cockpit.
4. Verifier que le solde, les dates, les devis, les subventions et les documents sont remplis.
5. Garder Stripe de cote : le test paiement peut attendre, ne pas en faire le coeur de la demo.

## Parcours recommande

### 1. Landing

Route : `/`

Message : "TaDiff rassemble ce qu'une compagnie doit suivre tous les jours : diffusion, aides, devis, tresorerie."

Montrer :
- promesse simple ;
- bouton beta ;
- cockpit du spectacle vivant.

Ne pas s'attarder : la valeur est dans l'app.

### 2. Beta

Route : `/beta`

Message : "On recrute peu de compagnies pour apprendre vite, pas pour faire du volume."

Montrer :
- 10 places ;
- liste d'attente ;
- besoin principal de la compagnie.

### 3. Cockpit

Route : `/dashboard`

Message : "C'est l'ecran du matin. On sait si la compagnie tient, ce qui vend, ce qui bloque et ce qui presse."

Montrer :
- tresorerie ;
- dates qui vendent ;
- pieces manquantes ;
- priorite du jour ;
- prochaines actions.

Action utile :
- cliquer sur "Visite guidee" si la conversation demande une demo accompagnee.

### 4. Spectacles

Route : `/shows`

Message : "Un spectacle n'est pas juste une fiche : c'est le dossier central pour vendre et deposer des aides."

Montrer :
- affiche ;
- documents indispensables et documents facultatifs ;
- statut de dossier ;
- lien vers fiche spectacle.

### 5. Documents

Route : `/documents`

Message : "Les dossiers remontent automatiquement par spectacle. On sait ce qui manque sans fouiller dans Drive."

Montrer :
- dossier prioritaire ;
- pourcentage de pieces indispensables ;
- explorateur par spectacle ;
- documents facultatifs possibles : devis, budget, RIB, statuts.

### 6. Carnet de diffusion

Route : `/contacts`

Message : "On ne parle pas de CRM : c'est le carnet des programmateurs, lieux, partenaires et mecenes."

Montrer :
- ajout d'un contact en pop-up ;
- tags personnalisables ;
- filtres par statut, role ou tag ;
- recherche rapide.

### 7. Diffusion

Route : `/pipeline`

Message : "Ici, on suit les dates possibles sans parler de CRM. Chaque date a une prochaine action."

Montrer :
- opportunites par etape ;
- date de jeu separee de la date de relance ;
- valeur ponderee ;
- prochaine relance ;
- creation de devis depuis une date si pertinent.

### 8. Subventions

Route : `/subventions`

Message : "Le radar dit quelles aides surveiller, ce qu'il manque et ce qui est urgent."

Montrer :
- priorites ;
- pieces demandees ;
- deadline ;
- bouton zip de dossier quand les pieces existent.

Note : certaines dates de reference doivent etre verifiees avant production.

### 9. Tresorerie

Route : `/finances`

Message : "La finance reste lisible : cash maintenant, frais fixes, projection, risque."

Montrer :
- solde actuel ;
- frais fixes ;
- projection ;
- prix recommande avec frais fixes lisses.

### 10. Calendrier

Route : `/calendar`

Message : "Les relances, aides, frais fixes et dates spectacle sont dans une seule lecture."

Montrer :
- prochaines echeances ;
- filtres ;
- creation evenement simple.

### 11. Facturation

Route : `/billing`

Message : "Les devis alimentent la tresorerie. Stripe test est branche cote code, mais on l'active quand les cles sont posees."

Montrer :
- devis actifs ;
- acomptes ;
- soldes ;
- bloc Stripe beta 19,99 EUR.

Ne pas dire :
- "le paiement marche en prod" tant que le test complet Stripe n'a pas ete fait.

### 12. Parametres

Route : `/settings`

Message : "C'est l'espace de controle : profil compagnie, documents permanents, equipe, demo, export."

Montrer seulement si besoin :
- documents de compagnie ;
- equipe et roles ;
- compagnie de demonstration ;
- export.

## Points UX valides au 2026-07-07

- Cockpit desktop lisible.
- Cockpit mobile sans superposition des bulles flottantes.
- Feedback et William masques sur mobile pour privilegier la lecture.
- Parcours public -> app coherent en mode demo.
- Stripe visible comme test/configuration, pas comme promesse active.
- Parcours guide William : cockpit -> spectacles -> documents -> contacts -> diffusion -> subventions -> finances -> calendrier.
- Contacts : creation en pop-up, tags et filtres.
- Spectacles : separation pieces indispensables / documents facultatifs.

## Points a surveiller

- La direction artistique par defaut reste bleue et assez SaaS ; pour une demo theatre plus marquee, utiliser le theme "Plateau noir", "Papier affiche" ou "Regie" dans Parametres.
- La page calendrier est encore une vue liste, pas une vraie vue mois/semaine.
- Les emails Resend ne sont pas branches.
- Stripe test complet volontairement reporte.
- William est scripte/regles simples, pas encore IA.
