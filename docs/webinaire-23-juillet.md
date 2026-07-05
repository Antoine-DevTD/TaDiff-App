# Webinaire TaDiff - 23 juillet 2026

Format keynote : 25 minutes de presentation + 10 minutes de questions.
Support : partage d'ecran sur le compte demo (Compagnie de l'Estran, installee via
Parametres > Compagnie de demonstration, dates toujours calees sur le jour J).

## Preparation technique (J-1)

- [ ] Compte demo vierge + installation de la Compagnie de l'Estran le matin meme (les dates relatives restent fraiches).
- [ ] Verifier migrations 009/010/011 appliquees, upload d'un vrai PDF sur Les Villes invisibles pour le zip.
- [ ] Choisir le theme le plus lisible en partage d'ecran (tester Velours et Papier affiche en visio).
- [ ] Fermer les onglets parasites, notifications OFF, zoom navigateur 110-125 %.
- [ ] Repetition complete chronometree au moins une fois avec Tony.
- [ ] Plan B : captures d'ecran de chaque etape si le reseau lache.

## Arc narratif

> Pourquoi les compagnies ferment, et qu'est-ce qu'on peut faire aujourd'hui pour eviter ca ?

1. Le probleme (3 min) - l'administration invisible qui epuise les compagnies.
2. La bascule (2 min) - et si votre compagnie avait un cockpit ?
3. La demo (15 min) - une journee de la Compagnie de l'Estran.
4. L'offre (3 min) - beta 10 places a 19,99 EUR.
5. Questions (10 min).

## 1. Le probleme (3 min) - sans montrer l'ecran

Texte d'appui :

"Une compagnie ne ferme presque jamais parce que le spectacle est mauvais.
Elle ferme parce qu'une subvention est passee, qu'un devis n'a pas ete relance,
que la tresorerie s'est tendue sans prevenir. L'administration de production,
c'est un metier - et la plupart des compagnies n'ont personne pour le faire."

Trois douleurs a nommer : les dates rates, la tresorerie subie, les dossiers eparpilles.

## 2. La bascule (2 min)

"On a construit TaDiff comme le cockpit d'une compagnie : un seul ecran qui repond a
quatre questions - est-ce qu'on tient, qu'est-ce qui vend, qu'est-ce qui bloque,
qu'est-ce qui presse."

Ouvrir le cockpit de l'Estran ici. Ne rien cliquer, laisser lire 5 secondes.

## 3. La demo (15 min) - scenario "une journee de compagnie"

Suivre la visite guidee comme colonne vertebrale (bouton Visite guidee), ou derouler
manuellement dans le meme ordre. Chaque sequence = 1 douleur, 1 action reelle.

### Sequence A - Je comprends ma situation (3 min, /dashboard)
- Lire le statut : "La compagnie tient, mais il faut surveiller."
- Tresorerie 14 250 EUR saisie (pas une maquette : montrer "Solde saisi le...").
- La priorite du jour : la relance de la fete de l'Erdre est en retard de 3 jours.
- Message cle : "Vous n'avez pas a chercher quoi faire, le cockpit vous le dit."

### Sequence B - Je relance sans y penser (3 min, /pipeline + /reminders)
- Ouvrir la diffusion : 9 600 EUR en negociation au Grand T, une date confirmee a Reze.
- Faire glisser/mettre a jour un statut en direct -> la relance se replanifie seule.
- Marquer la relance de l'Erdre "faite" -> le cockpit se met a jour.
- Message cle : "Chaque date possible porte sa relance. Rien ne sort du radar."

### Sequence C - Je prepare mon dossier de subvention (4 min, /subventions + fiche spectacle)
- Radar : la DRAC ferme dans 21 jours, dossier en montage, 1 piece a mettre a jour.
- Ouvrir Les Villes invisibles : checklist des pieces, uploader un PDF en direct.
- Retour subventions : cliquer "Telecharger le dossier .zip" -> ouvrir le zip recu.
- Message cle : "Le spectacle est le dossier central : on le complete une fois, on depose partout."

### Sequence D - Je ne vends pas a perte (3 min, /finances + /billing)
- Finances : frais fixes ~880 EUR/mois, projection 30/60/90 jours, date de risque.
- Lire une phrase du bloc "Ce que ca veut dire" (ex. le montant a lisser par date).
- Ouvrir le devis de Reze : acompte attendu 2 520 EUR, changer le statut en direct.
- Message cle : "Le prix minimum viable integre vos frais fixes. Vous vendez en connaissance de cause."

### Sequence E - On demarre en 10 minutes (2 min, /dashboard)
- Montrer la checklist Commencer sur un compte vierge (2e onglet prepare) :
  7 etapes, du premier spectacle a la premiere relance.
- Montrer le bouton Visite guidee : "William vous accompagne des la premiere connexion."
- Transparence : ce qui n'est pas encore branche est marque "Fonction prevue - non branchee".

## 4. L'offre (3 min)

- Beta du 6 aout : 10 compagnies, 19,99 EUR/mois, accompagnement direct.
- Liste d'attente : 30 places.
- CTA : page /beta ouverte a l'ecran, lien dans le chat.
- Teaser sobre : "William, l'assistant que vous venez de voir en version guidee,
  apprendra a repondre a vos questions dans les prochains mois."

## 5. Questions frequentes a preparer

- "Mes donnees sont ou ?" -> base europeenne Supabase, isolation par compagnie, export a tout moment.
- "Ca remplace mon comptable ?" -> non, ca l'alimente ; la compta reste chez le comptable.
- "Et si j'ai deja un tableur ?" -> import CSV des contacts, le reste se saisit en 10 minutes (checklist).
- "Le paiement ?" -> beta encaissee simplement ; Stripe complet au lancement de septembre.
- "Banque connectee ?" -> import CSV d'abord, connexion bancaire etudiee ensuite.

## Roles

- Titouan : demo ecran + reponses techniques.
- Tony : ouverture (le probleme), offre beta, moderation du chat et des questions.
