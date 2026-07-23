export type TheatreThemeId = "velours" | "plateau" | "affiche" | "loge" | "regie";

export type TheatreTheme = {
  id: TheatreThemeId;
  name: string;
  accent: string;
  background: string;
  border: string;
  cockpit: string;
  cockpitArrangement: string;
  foreground: string;
  landing: string;
  landingArrangement: string;
  layoutName: string;
  layoutSummary: string;
  mood: string;
};

export const defaultTheatreTheme: TheatreThemeId = "velours";

export const theatreThemes: TheatreTheme[] = [
  {
    id: "velours",
    name: "Bleu",
    accent: "#1d4ed8",
    background: "#f6f8fc",
    border: "#d8e0ef",
    cockpit: "Un cockpit clair et lisible, couleurs porteuses de sens et priorites du jour en avant.",
    cockpitArrangement: "Grande synthese en haut, priorite du jour a droite, puis ateliers par action.",
    foreground: "#0f172a",
    landing: "Une arrivee franche et claire, promesse directe et apercu du cockpit en pleine activite.",
    landingArrangement: "Hero classique en deux actes : promesse a gauche, cockpit vivant a droite.",
    layoutName: "Cockpit clair",
    layoutSummary: "Lecture rassurante pour une compagnie qui veut comprendre vite sans perdre la richesse.",
    mood: "Bleu franc, blanc, signal net.",
  },
  {
    id: "plateau",
    name: "Plateau noir",
    accent: "#9a6418",
    background: "#100f0f",
    border: "#3b302b",
    cockpit: "Une regie sombre, tres contrastee, pour faire ressortir les urgences et statuts.",
    cockpitArrangement: "Plein ecran d'alerte, priorites empilees, contraste fort pour les decisions critiques.",
    foreground: "#f4efe5",
    landing: "Un plein feu sur le produit, fond noir mat, peu de texte, tres demonstratif.",
    landingArrangement: "Scene immersive : peu de texte, grand apercu produit, lecture comme sous projecteur.",
    layoutName: "Plein feu",
    layoutSummary: "Agencement plus spectaculaire, utile pour une demo qui doit marquer vite.",
    mood: "Scene noire, projecteur chaud.",
  },
  {
    id: "affiche",
    name: "Papier affiche",
    accent: "#c43d2b",
    background: "#f7f1e3",
    border: "#d8c9ab",
    cockpit: "Un tableau d'administration clair, proche d'un dossier imprime annote.",
    cockpitArrangement: "Grille editorialisee : dossiers, colonnes nettes, blocs de decision comme des affiches.",
    foreground: "#171717",
    landing: "Une page affiche culturelle, blocs francs, typographie editorialisee.",
    landingArrangement: "Composition affiche : gros titre, blocs asymetriques, preuves produit en mosaique.",
    layoutName: "Affiche imprimee",
    layoutSummary: "Plus culturel et moins SaaS, bon pour parler aux compagnies et lieux.",
    mood: "Papier, encre, rouge imprime.",
  },
  {
    id: "loge",
    name: "Loge",
    accent: "#6f3847",
    background: "#f1e7e0",
    border: "#d4b9b0",
    cockpit: "Une interface plus douce, pensee pour accompagner sans intimider.",
    cockpitArrangement: "Parcours guide : prochaine action d'abord, puis explication et pièces associees.",
    foreground: "#211616",
    landing: "Une promesse humaine, compagnie accompagnee, ambiance coulisses.",
    landingArrangement: "Narration verticale : probleme, accompagnement, action suivante, sans effet tunnel.",
    layoutName: "Coulisses guidees",
    layoutSummary: "Agencement pédagogique pour les profils qui ne veulent pas apprendre un logiciel.",
    mood: "Bois, miroir, rose sourd.",
  },
  {
    id: "regie",
    name: "Regie",
    accent: "#315c49",
    background: "#e9ece6",
    border: "#b8c2b7",
    cockpit: "Un poste de pilotage dense, calme, ideal pour trésorerie et échéances.",
    cockpitArrangement: "Table de regie : bandeau d'indicateurs, rails operationnels, agenda et cash visibles.",
    foreground: "#101615",
    landing: "Une démonstration operationnelle : indicateurs, planning et decisions.",
    landingArrangement: "Landing de pilotage : indicateurs, planning, modules et decisions en grille dense.",
    layoutName: "Table de regie",
    layoutSummary: "Le plus operationnel pour vendre l'idee de remplacer une administration de production.",
    mood: "Console, vert sourd, signal.",
  },
];
