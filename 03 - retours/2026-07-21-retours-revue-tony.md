# Retours de la revue avec Tony

Date : 21 juillet 2026

Participants : Tony et Titouan

Contexte : passage en revue de l'application TaDiff avant le webinaire et la phase bêta.

## État du traitement

Lot 1 terminé dans le code le 21 juillet 2026 :

- ordre du cockpit corrigé
- checklist de prise en main ramenée de 7 à 6 étapes
- parcours d'accueil rejouable uniquement avec `demo_webinaire@yopmail.com`
- limite bêta centralisée à 15 places
- réponses Markdown de William affichées correctement
- création d'action visible immédiatement sans actualisation
- action terminée retirée immédiatement de la feuille de route
- création d'action ouverte directement depuis la fiche du spectacle courant

Vérifications réalisées : TypeScript, lint, build de production et 16 parcours Playwright.

Lot 2 terminé dans le code le 21 juillet 2026 :

- William peut être agrandi et réduit sans perdre la conversation
- les priorités deviennent des questions rapides lorsque l'IA est activée
- le prompt recentre William sur TaDiff et le spectacle vivant
- les questions sont classées dans une vue super admin, avec masquage des emails et téléphones et purge à 90 jours
- William peut réécrire le brouillon d'un email sans l'envoyer
- les documents d'un spectacle peuvent être sélectionnés et téléchargés avant l'ouverture de la messagerie
- Gmail, Outlook et la messagerie par défaut disposent d'un parcours explicite
- le popup Contact transmet le contact et le spectacle au composeur complet

Migration à appliquer : `sql/043_william_question_analytics.sql`.

## Décision générale

- La landing page est validée. Aucun changement n'est demandé pour le moment.
- La nouvelle direction prise pour la page des actions est validée.
- La diffusion devra faire l'objet d'une refonte de même ampleur que celle des actions.
- Le produit doit rester compréhensible par une compagnie de spectacle vivant sans vocabulaire de logiciel de gestion.

## 1. Cockpit

### Ordre des blocs

Intervertir les blocs actuels afin d'obtenir cet ordre :

1. La compagnie tient le cap
2. À faire maintenant
3. À faire ensuite

### Critère d'acceptation

Le premier écran doit commencer par une lecture rassurante de la situation de la compagnie, puis présenter les urgences et enfin les prochaines étapes.

## 2. Prise en main et démonstration

### Parcours d'accueil

- Le parcours actuel comporte 7 étapes.
- Fusionner les étapes 6 et 7 pour obtenir un parcours de 6 étapes.
- Vérifier que la progression, les libellés et les boutons correspondent bien au nouveau nombre d'étapes.

### Parcours du webinaire

- Le compte `demo_webinaire` doit permettre de rejouer une première inscription complète.
- Le parcours doit repartir de zéro, depuis l'accueil de première connexion.
- La démonstration doit ensuite dérouler les premières actions importantes du cockpit.
- La réinitialisation ne doit pas modifier les comptes ou les données réelles des autres compagnies.

### Critères d'acceptation

- Une commande ou une action réservée aux administrateurs permet de réinitialiser uniquement l'espace de démonstration.
- La réinitialisation est répétable et aboutit toujours au même état initial.
- Le parcours peut être testé intégralement avant le webinaire.

## 3. William

### Affichage des réponses

- Les marqueurs Markdown comme `**` apparaissent actuellement dans certaines réponses.
- Afficher correctement le gras, les listes et les paragraphes.
- Ne pas injecter de HTML non contrôlé.

### Taille de la fenêtre

- Ajouter une commande pour agrandir William.
- Prévoir au minimum un mode compact et un mode étendu.
- Le mode étendu doit laisser assez de place pour lire une réponse longue et poursuivre la conversation.
- Le fonctionnement doit rester correct sur téléphone.

### Priorités et suggestions

- Éviter les trois blocs séparés lorsque William est connecté.
- Retirer le bloc autonome de priorité suggérée ou l'intégrer directement à la conversation.
- Transformer les actions suggérées en questions rapides à poser à William.
- Exemples : `Que dois-je faire aujourd'hui ?`, `Quel dossier dois-je compléter ?`, `Quel contact dois-je relancer ?`.

### Périmètre des réponses

William doit répondre en priorité sur :

- TaDiff et son fonctionnement
- la compagnie connectée et ses données autorisées
- les spectacles, dates, actions, contacts, dossiers, aides et finances
- le spectacle vivant et les démarches directement liées à l'activité d'une compagnie

Lorsqu'une question est clairement hors sujet, William ne doit pas tenter une réponse générale. Réponse souhaitée, dans un ton léger :

> Ça s'éloigne un peu du théâtre, non ? Je peux en revanche vous aider sur TaDiff, votre compagnie ou vos spectacles.

Le refus doit rester poli et ne pas bloquer une question légitime située à la frontière du métier, par exemple le droit social, les contrats, les subventions ou la communication d'un spectacle.

### Questions les plus fréquentes

- Ajouter une mesure des questions posées à William afin de comprendre les besoins des compagnies.
- Prévoir une vue agrégée dans l'administration : thèmes fréquents, volume, période et questions sans réponse satisfaisante.
- Ne pas afficher publiquement les conversations.
- Limiter l'accès aux personnes autorisées.
- Éviter de conserver inutilement des données personnelles ou des documents dans les statistiques.
- Définir une durée de conservation et l'indiquer dans la documentation RGPD.

### Critères d'acceptation

- Aucun marqueur Markdown brut n'est visible.
- William peut être agrandi et réduit sans perdre la conversation.
- Les suggestions ouvrent ou préremplissent une vraie question.
- Une question hors périmètre reçoit le message de recentrage.
- Une question comme `Qu'est-ce que je dois faire ?` utilise les données autorisées de la compagnie pour proposer des étapes concrètes.
- L'administration permet de connaître les principaux thèmes demandés sans exposer les données d'une autre compagnie à un utilisateur ordinaire.

## 4. Actions

### Bugs à corriger

- Après la création d'une action, celle-ci ne s'affiche qu'après actualisation de la page.
- Le bouton `Marquer comme fait` ne fonctionne pas correctement.

### Depuis un spectacle

- Le bouton d'ajout d'action présent dans un spectacle ne doit pas simplement ouvrir la page des actions.
- Il doit ouvrir directement la fenêtre de création.
- Le spectacle courant doit être présélectionné et clairement visible.
- L'utilisateur doit pouvoir changer de spectacle s'il s'est trompé.

### Critères d'acceptation

- Une action créée apparaît immédiatement dans la bonne section, sans rechargement.
- Une action marquée comme faite disparaît des actions ouvertes ou passe immédiatement dans l'état terminé prévu.
- Les compteurs et le bloc de focus se mettent à jour en même temps.
- La création depuis un spectacle conserve le lien avec ce spectacle.
- Les erreurs de sauvegarde sont visibles et ne donnent pas l'impression que l'action a été créée.

## 5. Formules et limites de spectacles

Limites retenues pour les spectacles actifs :

| Formule | Spectacles actifs autorisés |
| --- | ---: |
| Première formule | 2 |
| Deuxième formule | 5 |
| Formule supérieure | Illimités |

### Règles à préciser

- Un spectacle archivé ne devrait pas consommer une place active.
- Un spectacle supprimé ne doit plus consommer de place.
- Le blocage doit être contrôlé côté serveur et pas seulement dans l'interface.
- L'utilisateur doit comprendre pourquoi la création est bloquée et comment changer de formule.
- Les comptes fondateurs, de démonstration ou offerts doivent avoir une règle explicite.

## 6. Spectacles et espace documentaire

### Documents de travail par spectacle

Créer un véritable espace de documents rattaché à chaque spectacle, distinct du dossier artistique indispensable.

Exemples de documents :

- feuilles de paie
- contrats des comédiens et techniciens
- contrats de cession ou de prestation
- feuilles de route
- devis et factures propres au spectacle
- documents de production internes

Fonctions attendues :

- créer un dossier
- créer des sous-dossiers si le modèle retenu le permet
- déposer plusieurs fichiers
- télécharger un fichier
- télécharger un ensemble de fichiers
- renommer et déplacer un document
- remplacer une version
- supprimer avec confirmation
- naviguer clairement entre les dossiers

Les droits doivent rester limités aux membres autorisés de la compagnie concernée.

### Captation

- Ajouter un champ pour le lien de captation du spectacle.
- Accepter au minimum YouTube et Vimeo.
- Valider le format du lien.
- Prévoir un libellé compréhensible et la possibilité de modifier ou supprimer le lien.

### Détection des fichiers

- La détection automatique actuelle est validée.
- Lorsqu'un type ne peut pas être détecté, afficher `À renseigner`.
- Permettre alors à l'utilisateur de choisir le type avant validation définitive.

### Critères d'acceptation

- Les documents de travail ne sont pas confondus avec les pièces publiques ou obligatoires du dossier artistique.
- Chaque document reste rattaché au bon spectacle et à la bonne compagnie.
- Le type `À renseigner` est visible et peut être corrigé.
- La captation peut être ouverte depuis la fiche du spectacle.

## 7. Diffusion et exploitation

La diffusion doit être repensée comme un outil métier complet, pas comme une simple liste de dates à vendre.

### Cas à prendre en charge

- cession d'une ou plusieurs représentations
- coréalisation ou partage de recettes, notamment en 50/50
- minimum garanti avec ou sans partage supplémentaire
- location d'un théâtre ou d'une salle
- série de représentations dans un même lieu
- exploitation longue, par exemple 18 dates
- festival d'Avignon ou situation comparable
- représentations scolaires et tout public dans une même exploitation
- dates confirmées, options et discussions commerciales

### Lisibilité

- Réduire le nombre de colonnes affichées simultanément.
- Éviter les informations compressées et les colonnes trop étroites.
- Privilégier une lecture par exploitation ou série de dates.
- Afficher le détail seulement lorsque l'utilisateur ouvre une exploitation.
- Reprendre le niveau de simplicité et de clarté obtenu sur la nouvelle page des actions.

### Billetterie et suivi financier

Prévoir un espace de suivi par représentation et par exploitation :

- jauge
- billets vendus
- invitations
- tarifs et catégories
- recettes brutes
- commissions de billetterie
- part compagnie et part lieu
- minimum garanti
- frais de location
- autres frais variables
- résultat de la représentation
- cumul de l'exploitation
- projection jusqu'à la dernière date
- seuil de rentabilité

Pour une série comme Avignon, l'utilisateur doit pouvoir répondre rapidement à ces questions :

- Où en suis-je après la cinquième représentation ?
- Suis-je encore dans le rouge ?
- Combien ai-je gagné ou perdu ?
- À quel moment puis-je atteindre l'équilibre ?

### Déclaration SACD

- Identifier les informations demandées dans la déclaration SACD mensuelle.
- Réutiliser les données de billetterie pour préparer cette déclaration.
- Ne pas présenter une déclaration comme automatiquement conforme tant que les règles et les données attendues n'ont pas été validées.

### Découpage recommandé

1. Modèle d'exploitation et séries de représentations
2. Interface de suivi des exploitations
3. Billetterie et résultats par représentation
4. Projection Avignon et seuil de rentabilité
5. Préparation de la déclaration SACD

Ce chantier nécessite une validation métier dédiée avant modification du schéma de données.

## 8. Vocabulaire et accents

### Termes à remplacer

| Terme actuel | Nouveau terme |
| --- | --- |
| Relance attentive | Relance |
| Prise de contact | Premier contact |

### Accents

- Effectuer une revue générale des textes visibles.
- Corriger les accents manquants, notamment sur les titres, boutons, états vides, messages d'erreur et fenêtres modales.
- Conserver les valeurs techniques internes si leur modification casserait les données existantes, mais afficher un libellé français correct dans l'interface.

## 9. Emails de diffusion

### Rédaction avec William

- Ajouter la possibilité de demander à William de rédiger ou améliorer le message.
- William doit tenir compte du spectacle, du contact, du type de relation et des informations réellement renseignées.
- L'utilisateur reste responsable de la validation avant l'ouverture de sa messagerie.

### Pièces jointes

Permettre de sélectionner les documents disponibles du spectacle, par exemple :

- dossier artistique
- fiche technique
- synopsis
- note d'intention
- texte de la pièce
- budget ou devis si pertinent

Un document absent doit être désactivé ou clairement signalé comme indisponible.

### Ouverture de Gmail et des autres messageries

- Remettre le bouton d'ouverture de Gmail qui fonctionnait dans la version précédente.
- Conserver une solution générique `mailto` ou un bouton pour les autres messageries.
- Un lien `mailto` ou l'URL de composition Gmail ne permet pas de joindre automatiquement des fichiers locaux de manière fiable.
- En première version, télécharger les pièces sélectionnées puis afficher un message clair avant d'ouvrir la messagerie.

Message proposé :

> Vos pièces jointes vont être téléchargées. Votre messagerie va ensuite s'ouvrir avec le destinataire, l'objet et le message préparés. Il ne restera qu'à ajouter les fichiers téléchargés avant l'envoi.

### Critères d'acceptation

- Le spectacle est sélectionnable et ses informations enrichissent réellement le mail.
- William peut produire une nouvelle proposition sans envoyer le message.
- Les pièces disponibles peuvent être cochées.
- Le téléchargement démarre avant l'ouverture de la messagerie.
- Le message explique clairement la dernière manipulation à effectuer.
- Gmail, Outlook et la messagerie par défaut disposent chacun d'un parcours explicite.

## 10. Dossiers, devis et factures

- Retirer `Voir les plans publics` dans la partie devis et factures.
- Retirer les éléments de pricing de cet espace.
- Masquer provisoirement l'onglet devis et factures s'il ne rend pas encore un service utile et complet.
- Ne pas supprimer les données existantes lors du masquage de l'interface.

## 11. Navigation et ressources

### Paramètres

- Corriger l'état actif de la navigation : la page Paramètres ne doit pas apparaître dans la catégorie Dossiers.
- Vérifier le comportement de la barre latérale pendant le défilement.

### Ressources

Ajouter un onglet `Ressources` juste au-dessus de `Paramètres`.

Premiers contenus envisagés :

- liens utiles Artcena
- Culture Pay
- organismes et ressources administratives du spectacle vivant
- guides et outils validés par TaDiff

Prévoir une gestion simple des catégories, du titre, de la description et du lien. Les ressources doivent pouvoir être administrées sans nouveau déploiement si possible.

## 12. Bêta

- Passer le nombre de places annoncé de 30 à 15.
- Rechercher toutes les occurrences visibles pour éviter une incohérence entre le bandeau, la page d'inscription, les emails et l'administration.
- Ne pas modifier les inscriptions déjà enregistrées.

## Ordre de traitement recommandé

### Lot 1 - Bloquants webinaire

1. [x] Corriger la création et la complétion des actions sans actualisation.
2. [x] Ouvrir directement la création d'action depuis un spectacle.
3. [x] Rejouer sans suppression le parcours `demo_webinaire`.
4. [x] Fusionner les étapes 6 et 7 de la prise en main.
5. [x] Passer les places bêta de 30 à 15.
6. [x] Corriger l'ordre des blocs du cockpit.
7. [x] Corriger les marqueurs `**` dans William.

### Lot 2 - William et emails

1. [x] Mode compact et mode étendu de William.
2. [x] Suggestions transformées en questions rapides.
3. [x] Réponses recentrées sur TaDiff et le spectacle vivant.
4. [x] Statistiques agrégées des questions fréquentes.
5. [x] Rédaction des emails avec William.
6. [x] Sélection, téléchargement et explication des pièces jointes.
7. [x] Retour des boutons Gmail, Outlook et messagerie par défaut.

### Lot 3 - Spectacles et documents

1. Lien de captation YouTube ou Vimeo.
2. Type de fichier `À renseigner` en cas de détection incertaine.
3. Espace documentaire de travail par spectacle.
4. Navigation par dossiers et gestion des versions.
5. Limites de spectacles actifs selon la formule.

### Lot 4 - Nettoyage et navigation

1. Revue des accents et des libellés.
2. Remplacement des termes métier validés.
3. Correction de l'état actif Paramètres.
4. Ajout de Ressources.
5. Masquage temporaire de l'espace devis et factures inutile.

### Lot 5 - Refonte de la diffusion

1. Atelier métier sur les modèles d'exploitation.
2. Nouvelle structure de données.
3. Nouvelle interface par exploitation et série de dates.
4. Billetterie, résultat et projection.
5. Préparation SACD après validation des informations attendues.

## Points nécessitant une décision de Tony

- Définition exacte d'un spectacle actif et règles d'archivage.
- Noms commerciaux définitifs des trois formules.
- Niveau de support inclus dans chaque formule.
- Durée de conservation des questions et conversations de William.
- Personnes autorisées à consulter les statistiques William.
- Documents de travail réellement nécessaires dans la première version de l'espace spectacle.
- Structure de dossiers libre ou structure proposée par défaut.
- Données exactes à suivre pour la billetterie et la déclaration SACD.
- Ressources à publier en premier dans le nouvel onglet.

## Règles techniques à conserver pendant les développements

- Toute donnée doit rester isolée par compagnie avec contrôle d'accès et RLS.
- Les limites de formule doivent être vérifiées côté serveur.
- Les statistiques William ne doivent pas devenir un accès indirect aux données privées des compagnies.
- Les réponses de William doivent utiliser un contexte borné et autorisé, sans exposer les données d'une autre compagnie.
- Toute évolution du schéma comprend migration, policies, types TypeScript, requêtes et tests d'isolation.
- Toute action visible doit fonctionner ou annoncer clairement qu'elle n'est pas encore disponible.
- Les flux essentiels doivent être testés sans connexion, avec une autre compagnie, avec le bon membre et avec les rôles spéciaux concernés.
