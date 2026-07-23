import type { ShowDocumentType } from "@/types";

// Dispositifs de reference proposes a l'import pour demarrer le radar.
// Dates verifiees au 2026-07-04 quand la source le permet ; sinon la date est
// indicative et l'eligibilite le precise. Chaque entree reste editable par la
// compagnie apres import.

export type ReferenceGrant = {
  title: string;
  funder: string;
  territory: string;
  discipline: string;
  deadline: string;
  amount: number;
  requirements: ShowDocumentType[];
  eligibility: string;
  sourceUrl: string;
  themes: string[];
};

const standardPieces: ShowDocumentType[] = [
  "Dossier artistique",
  "Note d'intention",
  "Budget",
  "RIB",
  "Statuts",
];

export const referenceGrants: ReferenceGrant[] = [
  {
    title: "Aide a la production et a la diffusion - session d'aout",
    funder: "CNM",
    territory: "France",
    discipline: "Spectacle vivant musical",
    deadline: "2026-08-26",
    amount: 15000,
    requirements: [...standardPieces, "Fiche technique"],
    eligibility:
      "Date limite verifiee (26 aout 2026). Prevoir 8 semaines d'analyse et une affiliation CNM a anticiper d'au moins 20 jours ouvres.",
    sourceUrl:
      "https://cnm.fr/aides-financieres/aide-a-la-production-et-a-la-diffusion-de-spectacle-vivant/",
    themes: ["Production", "Diffusion", "Musique"],
  },
  {
    title: "Aide a la production et a la diffusion - session d'octobre",
    funder: "CNM",
    territory: "France",
    discipline: "Spectacle vivant musical",
    deadline: "2026-10-07",
    amount: 15000,
    requirements: [...standardPieces, "Fiche technique"],
    eligibility:
      "Date limite verifiee (7 octobre 2026). Memes conditions que la session d'aout : affiliation et delais d'instruction a anticiper.",
    sourceUrl:
      "https://cnm.fr/aides-financieres/aide-a-la-production-et-a-la-diffusion-de-spectacle-vivant/",
    themes: ["Production", "Diffusion", "Musique"],
  },
  {
    title: "Aide au projet spectacle vivant",
    funder: "DRAC (Ministere de la Culture)",
    territory: "Region de la compagnie",
    discipline: "Toutes disciplines",
    deadline: "2026-09-30",
    amount: 10000,
    requirements: [...standardPieces, "Synopsis"],
    eligibility:
      "Date indicative : chaque DRAC publie son propre calendrier, a vérifier aupres de votre region.",
    sourceUrl:
      "https://www.culture.gouv.fr/catalogue-des-demarches-et-subventions/subvention/aide-au-projet-ou-au-fonctionnement-spectacle-vivant-et-arts-visuels",
    themes: ["Création", "Fonctionnement", "DRAC"],
  },
  {
    title: "Aides aux structures employant des artistes",
    funder: "Adami",
    territory: "France",
    discipline: "Artistes-interpretes",
    deadline: "2026-09-15",
    amount: 20000,
    requirements: [...standardPieces],
    eligibility:
      "Plafond mentionne de 20 000 EUR selon dispositif, aide simplifiee possible. Date indicative : vérifier le calendrier des commissions.",
    sourceUrl: "https://www.adami.fr/suis-porteurde-projet/les-aides/",
    themes: ["Emploi artistique", "Production"],
  },
  {
    title: "Aide aux projets artistiques",
    funder: "SPEDIDAM",
    territory: "France",
    discipline: "Artistes-interpretes",
    deadline: "2026-09-01",
    amount: 8000,
    requirements: [...standardPieces, "Fiche technique"],
    eligibility:
      "Date indicative : les depots suivent le calendrier des commissions SPEDIDAM, a vérifier sur leur page officielle.",
    sourceUrl: "https://www.spedidam.fr/aides-aux-projets/calendrier-des-commissions/",
    themes: ["Création", "Diffusion", "Emploi"],
  },
  {
    title: "Aide a la création de textes dramatiques",
    funder: "SACD - Beaumarchais",
    territory: "France",
    discipline: "Theatre, ecriture",
    deadline: "2026-09-15",
    amount: 5000,
    requirements: ["Texte", "Note d'intention", "Dossier artistique", "RIB"],
    eligibility:
      "Date indicative : l'association Beaumarchais-SACD fonctionne par sessions, calendrier a vérifier.",
    sourceUrl: "https://beaumarchais.asso.fr/",
    themes: ["Ecriture", "Création", "Theatre"],
  },
  {
    title: "Aide a la diffusion regionale",
    funder: "Conseil regional",
    territory: "Region de la compagnie",
    discipline: "Toutes disciplines",
    deadline: "2026-10-15",
    amount: 6000,
    requirements: [...standardPieces, "Devis"],
    eligibility:
      "Date indicative : chaque region a son propre dispositif et calendrier (guichet unique regional a identifier).",
    sourceUrl: "https://www.culture.gouv.fr/Aides-demarches",
    themes: ["Diffusion", "Territoire"],
  },
  {
    title: "Subvention culture de la ville",
    funder: "Ville / intercommunalite",
    territory: "Commune de la compagnie",
    discipline: "Toutes disciplines",
    deadline: "2026-11-30",
    amount: 3000,
    requirements: [...standardPieces],
    eligibility:
      "Date indicative : la plupart des villes ouvrent leur campagne de subventions culture a l'automne pour l'annee suivante.",
    sourceUrl: "https://www.service-public.fr/associations/vosdroits/F3180",
    themes: ["Fonctionnement", "Territoire"],
  },
  {
    title: "Aide a la mobilite internationale",
    funder: "Institut francais",
    territory: "International",
    discipline: "Toutes disciplines",
    deadline: "2026-10-01",
    amount: 7000,
    requirements: [...standardPieces, "Fiche technique"],
    eligibility:
      "Date indicative : les appels varient selon les programmes (tournées, residences, saisons croisees), a vérifier par programme.",
    sourceUrl: "https://www.institutfrancais.com/fr/offres",
    themes: ["International", "Tournee"],
  },
  {
    title: "Europe Creative - volet Culture",
    funder: "Commission europeenne",
    territory: "Europe",
    discipline: "Toutes disciplines",
    deadline: "2026-12-15",
    amount: 30000,
    requirements: [...standardPieces, "Fiche technique"],
    eligibility:
      "Date indicative : appels annuels avec partenariat europeen requis. Dossier exigeant, a anticiper plusieurs mois.",
    sourceUrl: "https://culture.ec.europa.eu/fr/creative-europe",
    themes: ["Europe", "Cooperation"],
  },
];
