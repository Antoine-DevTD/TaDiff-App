export type TheatreThemeId = "velours" | "plateau" | "affiche" | "loge" | "regie";

export type TheatreTheme = {
  id: TheatreThemeId;
  name: string;
  accent: string;
  background: string;
  border: string;
  cockpit: string;
  foreground: string;
  landing: string;
  mood: string;
};

export const defaultTheatreTheme: TheatreThemeId = "velours";

export const theatreThemes: TheatreTheme[] = [
  {
    id: "velours",
    name: "Velours",
    accent: "#8f2f2c",
    background: "#f4eadb",
    border: "#d7beaa",
    cockpit: "Un bureau de production chaleureux, avec alertes lisibles et priorites du jour.",
    foreground: "#1f1615",
    landing: "Une arrivee rideau rouge, promesse directe et apercu du cockpit en pleine activite.",
    mood: "Rideau, laiton, papier creme.",
  },
  {
    id: "plateau",
    name: "Plateau noir",
    accent: "#9a6418",
    background: "#100f0f",
    border: "#3b302b",
    cockpit: "Une regie sombre, tres contrastee, pour faire ressortir les urgences et statuts.",
    foreground: "#f4efe5",
    landing: "Un plein feu sur le produit, fond noir mat, peu de texte, tres demonstratif.",
    mood: "Scene noire, projecteur chaud.",
  },
  {
    id: "affiche",
    name: "Papier affiche",
    accent: "#c43d2b",
    background: "#f7f1e3",
    border: "#d8c9ab",
    cockpit: "Un tableau d'administration clair, proche d'un dossier imprime annote.",
    foreground: "#171717",
    landing: "Une page affiche culturelle, blocs francs, typographie editorialisee.",
    mood: "Papier, encre, rouge imprime.",
  },
  {
    id: "loge",
    name: "Loge",
    accent: "#6f3847",
    background: "#f1e7e0",
    border: "#d4b9b0",
    cockpit: "Une interface plus douce, pensee pour accompagner sans intimider.",
    foreground: "#211616",
    landing: "Une promesse humaine, compagnie accompagnee, ambiance coulisses.",
    mood: "Bois, miroir, rose sourd.",
  },
  {
    id: "regie",
    name: "Regie",
    accent: "#315c49",
    background: "#e9ece6",
    border: "#b8c2b7",
    cockpit: "Un poste de pilotage dense, calme, ideal pour tresorerie et echeances.",
    foreground: "#101615",
    landing: "Une demonstration operationnelle : indicateurs, planning et decisions.",
    mood: "Console, vert sourd, signal.",
  },
];
