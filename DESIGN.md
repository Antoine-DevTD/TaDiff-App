---
name: TaDiff
description: Le carnet de production éclairé des compagnies de spectacle vivant
colors:
  bleu-conduite: "#1d4ed8"
  bleu-conduite-profond: "#1e40af"
  encre-scene: "#0b1220"
  graphite: "#0f172a"
  papier-repetition: "#e8eef7"
  feuille-blanche: "#ffffff"
  papier-appuye: "#eef2f9"
  crayon-secondaire: "#4f5a6b"
  ligne-cahier: "#c3d2ea"
  validation: "#15803d"
  vigilance: "#b45309"
  danger: "#dc2626"
  lumiere-servante: "#fde096"
  halo-servante: "#93c5fd"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(3rem, 7vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.16em"
rounded:
  xs: "2px"
  sm: "6px"
  md: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.bleu-conduite}"
    textColor: "{colors.feuille-blanche}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.bleu-conduite-profond}"
    textColor: "{colors.feuille-blanche}"
  button-secondary:
    backgroundColor: "{colors.feuille-blanche}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "40px"
  field:
    backgroundColor: "{colors.feuille-blanche}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.feuille-blanche}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: TaDiff

## Overview

**Creative North Star: "Le carnet de production éclairé"**

TaDiff transforme la densité administrative d'une compagnie en un espace de travail clair, ordonné et humain. L'interface évoque un carnet de production tenu avec soin : un papier légèrement bleuté, une encre sombre, des lignes fines pour structurer et un bleu de conduite réservé aux décisions et aux états actifs.

Le cockpit privilégie la précision et la lecture rapide. Les surfaces sont sobres, les composants sont compacts sans être étroits et la hiérarchie vient d'abord de l'alignement, de la typographie et des séparations. La personnalité culturelle apparaît dans les détails de scène, les affiches, le vocabulaire et les interactions de William, jamais dans une décoration qui gêne le travail.

Les anti-références sont les interfaces « startup nation », les tableaux financiers froids, les cartes décoratives imbriquées et les effets visuels sans rôle opérationnel.

**Key Characteristics:**

- Clarté d'un carnet de travail bien tenu.
- Contraste net entre papier, encre et bleu d'action.
- Densité utile, avec une action principale immédiatement repérable.
- Détails théâtraux discrets plutôt qu'habillage spectaculaire.
- États, risques et validations compréhensibles sans expertise technique.

## Colors

La palette par défaut associe un papier bleu très clair, une encre presque noire et un bleu franc utilisé avec retenue pour guider l'action.

### Primary

- **Bleu de conduite** (`#1d4ed8`) : actions principales, navigation active, liens importants, focus et informations sélectionnées.
- **Bleu de conduite profond** (`#1e40af`) : survol et renforcement des actions principales.

### Neutral

- **Encre de scène** (`#0b1220`) : sidebar, grands aplats sombres et contraste maximal.
- **Graphite** (`#0f172a`) : texte principal et valeurs opérationnelles.
- **Papier de répétition** (`#e8eef7`) : fond général du cockpit.
- **Feuille blanche** (`#ffffff`) : panneaux, champs et fenêtres.
- **Papier appuyé** (`#eef2f9`) : fonds secondaires, sélections douces et zones de regroupement.
- **Crayon secondaire** (`#4f5a6b`) : descriptions et informations de second niveau.
- **Ligne de cahier** (`#c3d2ea`) : bordures, séparateurs et structure.

### Status

- **Validation** (`#15803d`) : réussite, confirmation et dossier prêt.
- **Vigilance** (`#b45309`) : échéance proche, attention ou état intermédiaire.
- **Danger** (`#dc2626`) : erreur, refus et suppression.

**The Blue Pencil Rule.** Le bleu désigne une action, une sélection ou un point d'attention. Il ne sert pas à colorer toutes les surfaces.

**The Status Truth Rule.** Les couleurs de statut conservent un sens stable : vert pour confirmé, ambre pour attention et rouge pour erreur ou destruction.

Les jeux de couleurs `plateau`, `affiche`, `loge` et `régie` restent présents dans les tokens historiques. Les nouvelles surfaces utilisent la palette bleue par défaut tant qu'une réactivation produit de ces thèmes n'est pas explicitement décidée.

## Typography

**Display Font:** Inter Variable, avec `-apple-system`, `BlinkMacSystemFont` et `Segoe UI` en secours  
**Body Font:** Inter Variable, avec la même pile de secours  
**Label/Mono Font:** pile système monospace uniquement pour les valeurs techniques qui l'exigent

**Character:** Inter donne une lecture nette et familière aux tableaux, montants et formulaires. Les chiffres utilisent des variantes tabulaires pour préserver les alignements du cockpit.

### Hierarchy

- **Display** (600, `clamp(3rem, 7vw, 4.5rem)`, 1.04) : titres de landing uniquement.
- **Headline** (600, `clamp(1.875rem, 4vw, 2.25rem)`, 1.15) : ouvertures de sections publiques et écrans majeurs.
- **Page Title** (600, `1.5rem`, 1.3) : titre d'une rubrique du cockpit.
- **Title** (600, `1.25rem`, 1.3) : fenêtre, panneau important ou bloc de travail.
- **Body** (500, `0.875rem`, 1.5) : texte courant, formulaires et données.
- **Label** (600, `0.75rem`, `0.16em`, majuscules) : sourcils, catégories et repères courts.

**The Operational Scale Rule.** Les titres du cockpit restent proportionnés à leur outil ; la typographie de hero ne descend pas dans les tableaux, fenêtres ou panneaux compacts.

**The Numeric Rhythm Rule.** Les montants, dates et indicateurs utilisent `font-variant-numeric: tabular-nums`.

## Layout

Le cockpit utilise une sidebar fixe de `240px` sur grand écran, une barre de navigation mobile en bas et un contenu principal fluide. Les pages publiques se calent sur un conteneur maximal de `1280px`.

La grille part du mobile et s'élargit avec des points de rupture principalement à `640px`, `768px`, `1024px` et `1280px`. Les mises en page opérationnelles utilisent `minmax(0, 1fr)` afin que les textes, tableaux et contrôles ne forcent pas la largeur.

Le rythme courant suit des pas de 4, 8, 12, 16, 20, 24 et 32 pixels. Dans le cockpit, une section organise plusieurs éléments sans devenir elle-même une carte flottante. Les cartes servent aux objets répétés, aux outils clairement encadrés et aux fenêtres.

Sur mobile, les colonnes deviennent des piles, les actions restent accessibles sans survol et les éléments fixes respectent la navigation basse.

## Elevation & Depth

L'interface est plate par défaut. La profondeur est principalement créée par les différences de ton, les bordures et la superposition fonctionnelle. Les ombres restent légères sur les cartes et boutons, puis deviennent plus fortes uniquement pour une sidebar fixe, une fenêtre ou un menu qui doit clairement passer au-dessus du contenu.

### Shadow Vocabulary

- **Repos léger** (`shadow-sm`, teinté par `shadow-ink/10`) : carte, bouton ou contrôle posé sur le papier.
- **Surélévation fonctionnelle** (`shadow-xl`) : sidebar, menu flottant ou panneau temporaire.
- **Fenêtre modale** (`shadow-xl` avec voile `bg-ink/40`) : dialogue qui bloque momentanément le reste du flux.

**The Flat Working Surface Rule.** Une section normale ne flotte pas au-dessus de la page. L'ombre indique une vraie superposition ou une interaction.

## Shapes

Les contrôles utilisent principalement un rayon de `6px` et les cartes ou fenêtres un rayon de `8px`. Les badges et indicateurs courts peuvent être entièrement arrondis.

Les bordures fines sont structurelles : elles séparent les zones, délimitent les champs et rendent les tableaux lisibles. Les grands arrondis décoratifs, les cartes en pilule et les compositions de cartes imbriquées ne font pas partie du langage TaDiff.

## Components

### Buttons

Les boutons sont compacts, stables et explicites.

- **Shape:** rectangle à rayon modéré (`6px`), hauteur minimale `40px`.
- **Primary:** Bleu de conduite, texte blanc, `8px 16px`.
- **Hover / Focus:** bleu profond au survol ; contour bleu de `2px` décalé de `2px` au clavier.
- **Secondary:** feuille blanche, bordure Ligne de cahier, texte Graphite.
- **Ghost:** texte secondaire, fond Papier appuyé uniquement au survol.

### Chips

- **Style:** fond teinté léger, texte dans la couleur sémantique, rayon complet.
- **State:** les états ne partagent pas la même couleur lorsqu'ils décrivent des situations différentes.
- **Usage:** statut court, filtre ou information secondaire ; jamais commande principale.

### Cards / Containers

- **Corner Style:** `8px`.
- **Background:** Feuille blanche ou Papier appuyé pour un regroupement interne.
- **Shadow Strategy:** légère au repos, absente pour les bandes de page.
- **Border:** Ligne de cahier.
- **Internal Padding:** `20px` par défaut, réduit sur les listes denses.

### Inputs / Fields

- **Style:** fond blanc, bordure Ligne de cahier, rayon `6px`, hauteur minimale `44px`.
- **Focus:** bordure Bleu de conduite et halo bleu à faible opacité.
- **Error / Disabled:** rouge explicite pour l'erreur ; opacité réduite et absence d'interaction pour le désactivé.

### Navigation

La sidebar utilise Encre de scène, des libellés blancs et une icône Lucide par destination. L'élément actif associe un fond blanc translucide, une barre latérale blanche et un contraste renforcé. La navigation mobile conserve des cibles d'au moins `44px`.

### Dialogs

Les fenêtres utilisent un voile sombre légèrement flouté, une largeur adaptée à la tâche, un en-tête fixe et un contenu défilable. Elles se ferment par le bouton visible, `Échap` ou un clic sur le voile. Le focus reste contenu dans la fenêtre puis revient à son origine.

### William

William reprend la marque TaDiff et le Bleu de conduite. Son mouvement attire ponctuellement l'attention sans perturber la lecture et respecte `prefers-reduced-motion`. Ses propositions ressemblent à des actions guidées du cockpit, pas à un chatbot ajouté par-dessus l'interface.

## Do's and Don'ts

### Do:

- **Do** partir du Papier de répétition, de l'Encre de scène et du Bleu de conduite pour toute nouvelle surface.
- **Do** réserver la couleur forte aux actions, sélections et états qui ont un sens.
- **Do** utiliser les icônes Lucide existantes et conserver une alternative textuelle ou un tooltip lorsqu'elles sont ambiguës.
- **Do** maintenir des cibles interactives d'au moins `40px`, et `44px` pour les contrôles mobiles ou isolés.
- **Do** privilégier les listes, bandes et grilles non encadrées lorsqu'une carte n'apporte aucune structure utile.
- **Do** prévoir les états vide, chargement, erreur, focus clavier et réduction des animations.

### Don't:

- **Don't** transformer TaDiff en dashboard SaaS générique couvert de cartes décoratives.
- **Don't** empiler une carte dans une autre carte ou faire flotter chaque section.
- **Don't** employer des dégradés, halos ou animations sans fonction ; le bandeau bêta et les interactions de William sont des usages ciblés.
- **Don't** utiliser une couleur de statut pour deux significations métier différentes.
- **Don't** masquer une action essentielle uniquement derrière un survol ou un clic droit.
- **Don't** utiliser les autres thèmes théâtre comme nouvelle norme sans décision produit explicite.
