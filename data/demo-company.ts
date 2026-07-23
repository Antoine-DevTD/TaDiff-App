import type {
  FixedCostCategory,
  FixedCostFrequency,
  GrantStatus,
  PatronageStatus,
  PipelineStage,
  ShowDocumentStatus,
  ShowDocumentType,
} from "@/types";

// Compagnie fictive utilisee par l'action "Installer la compagnie de demonstration".
// Toutes les dates sont relatives au jour de l'installation pour que le cockpit
// reste vivant (relance en retard, deadline proche, projection credible).

export const demoCompanyName = "Compagnie de l'Estran";

function dateAfterDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

type DemoShow = {
  key: string;
  title: string;
  discipline: string;
  status: "En diffusion" | "Creation" | "En pause";
  nextDateInDays: number | null;
  budget: number;
  posterUrl: string;
  notes: string;
};

type DemoContact = {
  key: string;
  name: string;
  organization: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  status: "Prospect" | "En discussion" | "Partenaire";
  tags: string[];
};

type DemoOpportunity = {
  title: string;
  contactKey: string;
  showKey: string;
  stage: PipelineStage;
  value: number;
  probability: number;
  performanceInDays: number | null;
  nextAction: string;
  nextFollowUpInDays: number | null;
};

type DemoReminder = {
  title: string;
  dueInDays: number;
  relatedTo: string;
  priority: "low" | "normal" | "high";
};

type DemoFixedCost = {
  label: string;
  category: FixedCostCategory;
  amount: number;
  frequency: FixedCostFrequency;
  nextDueInDays: number;
  notes: string;
};

type DemoDocument = {
  showKey: string;
  title: string;
  documentType: ShowDocumentType;
  status: ShowDocumentStatus;
  notes: string;
};

type DemoQuote = {
  number: string;
  opportunityTitle: string;
  title: string;
  organization: string;
  amount: number;
  depositDue: number;
  balanceDue: number;
  status: "A preparer" | "Envoye" | "Acompte attendu" | "Solde attendu" | "Archive";
  dueInDays: number;
};

type DemoGrant = {
  title: string;
  funder: string;
  territory: string;
  discipline: string;
  deadlineInDays: number;
  amount: number;
  status: GrantStatus;
  showKey: string | null;
  requirements: ShowDocumentType[];
  eligibility: string;
  sourceUrl: string;
};

export const demoShows: DemoShow[] = [
  {
    key: "villes",
    title: "Les Villes invisibles",
    discipline: "Théâtre",
    status: "En diffusion",
    nextDateInDays: 18,
    budget: 42000,
    posterUrl: "https://picsum.photos/seed/tadiff-villes/800/1000",
    notes:
      "Adaptation de Calvino pour 4 interpretes. Jauge 400, duree 1h25, décors legers, tournee possible en salle et en exterieur.",
  },
  {
    key: "freres",
    title: "Freres migrateurs",
    discipline: "Jeune public",
    status: "Creation",
    nextDateInDays: 45,
    budget: 28000,
    posterUrl: "https://picsum.photos/seed/tadiff-freres/800/1000",
    notes:
      "Création 2026-2027, des 7 ans. Residence prevue a l'automne, sortie de création visee pour janvier. Deux interpretes et un musicien.",
  },
  {
    key: "cabaret",
    title: "Cabaret des solstices",
    discipline: "Musique",
    status: "En diffusion",
    nextDateInDays: 9,
    budget: 15000,
    posterUrl: "https://picsum.photos/seed/tadiff-cabaret/800/1000",
    notes:
      "Forme légère en trio, ideale pour les saisons d'ete et les evenements de collectivites. Fiche technique reduite.",
  },
];

export const demoContacts: DemoContact[] = [
  {
    key: "grandt",
    name: "Claire Besnard",
    organization: "Le Grand T",
    role: "Programmatrice",
    email: "c.besnard@legrandt-demo.fr",
    phone: "06 21 45 10 01",
    city: "Nantes",
    status: "En discussion",
    tags: ["Théâtre", "Grande salle"],
  },
  {
    key: "stnazaire",
    name: "Marc Lefloch",
    organization: "Scene nationale de Saint-Nazaire",
    role: "Directeur",
    email: "m.lefloch@snsn-demo.fr",
    phone: "06 21 45 10 02",
    city: "Saint-Nazaire",
    status: "Prospect",
    tags: ["Scene nationale", "Atlantique"],
  },
  {
    key: "reze",
    name: "Sophie Aubert",
    organization: "Théâtre municipal de Rezé",
    role: "Chargée de programmation",
    email: "s.aubert@reze-demo.fr",
    phone: "06 21 45 10 03",
    city: "Reze",
    status: "Partenaire",
    tags: ["Municipal", "Partenaire"],
  },
  {
    key: "aurillac",
    name: "Julien Roche",
    organization: "Festival international de théâtre de rue",
    role: "Programmateur",
    email: "j.roche@festival-demo.fr",
    phone: "06 21 45 10 04",
    city: "Aurillac",
    status: "Prospect",
    tags: ["Festival", "Rue"],
  },
  {
    key: "erdre",
    name: "Anne Guiho",
    organization: "Communaute de communes Erdre et Gesvres",
    role: "Responsable culture",
    email: "a.guiho@cceg-demo.fr",
    phone: "06 21 45 10 05",
    city: "Nort-sur-Erdre",
    status: "En discussion",
    tags: ["Collectivite", "Ete"],
  },
  {
    key: "guerande",
    name: "Paul Kervadec",
    organization: "Office culturel de Guerande",
    role: "Coordinateur",
    email: "p.kervadec@guerande-demo.fr",
    phone: "06 21 45 10 06",
    city: "Guerande",
    status: "Prospect",
    tags: ["Office culturel", "Territoire"],
  },
  {
    key: "paperie",
    name: "Lisa Moreau",
    organization: "La Paperie - CNAREP",
    role: "Chargée de production",
    email: "l.moreau@paperie-demo.fr",
    phone: "06 21 45 10 07",
    city: "Angers",
    status: "En discussion",
    tags: ["CNAREP", "Residence"],
  },
  {
    key: "mecene",
    name: "Thomas Vidal",
    organization: "Fondation Ouest Mécénat",
    role: "Délégué général",
    email: "t.vidal@fondation-demo.fr",
    phone: "06 21 45 10 08",
    city: "Nantes",
    status: "Prospect",
    tags: ["Mécénat", "Fondation"],
  },
];

export const demoOpportunities: DemoOpportunity[] = [
  {
    title: "Les Villes invisibles - Le Grand T - saison 26/27",
    contactKey: "grandt",
    showKey: "villes",
    stage: "Negociation",
    value: 9600,
    probability: 70,
    performanceInDays: 96,
    nextAction: "Envoyer la proposition ajustee avec 2 representations",
    nextFollowUpInDays: 4,
  },
  {
    title: "Cabaret des solstices - fete de l'Erdre",
    contactKey: "erdre",
    showKey: "cabaret",
    stage: "Relance prevue",
    value: 3200,
    probability: 55,
    performanceInDays: 42,
    nextAction: "Relancer après le comité du budget",
    nextFollowUpInDays: -3,
  },
  {
    title: "Les Villes invisibles - Saint-Nazaire",
    contactKey: "stnazaire",
    showKey: "villes",
    stage: "Contacte",
    value: 7800,
    probability: 30,
    performanceInDays: 118,
    nextAction: "Proposer une visite sur la date de Reze",
    nextFollowUpInDays: 10,
  },
  {
    title: "Cabaret des solstices - Guerande ete 2027",
    contactKey: "guerande",
    showKey: "cabaret",
    stage: "A qualifier",
    value: 2800,
    probability: 20,
    performanceInDays: 390,
    nextAction: "Qualifier le budget et la jauge exterieure",
    nextFollowUpInDays: 14,
  },
  {
    title: "Freres migrateurs - residence La Paperie",
    contactKey: "paperie",
    showKey: "freres",
    stage: "Negociation",
    value: 4500,
    probability: 60,
    performanceInDays: 82,
    nextAction: "Caler les dates de residence d'automne",
    nextFollowUpInDays: 6,
  },
  {
    title: "Les Villes invisibles - Reze - 2 dates",
    contactKey: "reze",
    showKey: "villes",
    stage: "Confirme",
    value: 8400,
    probability: 100,
    performanceInDays: 21,
    nextAction: "Envoyer le contrat de cession pour signature",
    nextFollowUpInDays: null,
  },
  {
    title: "Les Villes invisibles - Aurillac 2027",
    contactKey: "aurillac",
    showKey: "villes",
    stage: "Perdu",
    value: 5200,
    probability: 0,
    performanceInDays: null,
    nextAction: "",
    nextFollowUpInDays: null,
  },
];

export const demoReminders: DemoReminder[] = [
  {
    title: "Relancer Anne Guiho sur la fete de l'Erdre",
    dueInDays: -3,
    relatedTo: "Cabaret des solstices - fete de l'Erdre",
    priority: "high",
  },
  {
    title: "Envoyer la proposition ajustee au Grand T",
    dueInDays: 0,
    relatedTo: "Les Villes invisibles - Le Grand T - saison 26/27",
    priority: "high",
  },
  {
    title: "Préparer le contrat de cession pour Rezé",
    dueInDays: 2,
    relatedTo: "Les Villes invisibles - Reze - 2 dates",
    priority: "normal",
  },
  {
    title: "Completer le dossier DRAC avant depot",
    dueInDays: 7,
    relatedTo: "Les Villes invisibles",
    priority: "normal",
  },
  {
    title: "Demander le calendrier residence a La Paperie",
    dueInDays: 12,
    relatedTo: "Freres migrateurs - residence La Paperie",
    priority: "low",
  },
];

export const demoFixedCosts: DemoFixedCost[] = [
  {
    label: "Assurance responsabilité civile",
    category: "Assurance",
    amount: 1180,
    frequency: "Annuel",
    nextDueInDays: 70,
    notes: "Contrat MAIF, renouvellement automatique.",
  },
  {
    label: "Banque professionnelle",
    category: "Banque",
    amount: 29,
    frequency: "Mensuel",
    nextDueInDays: 12,
    notes: "Frais de tenue de compte.",
  },
  {
    label: "Cabinet comptable",
    category: "Comptable",
    amount: 240,
    frequency: "Mensuel",
    nextDueInDays: 20,
    notes: "Paie des intermittents + cloture annuelle.",
  },
  {
    label: "Local de stockage décors",
    category: "Stockage",
    amount: 145,
    frequency: "Mensuel",
    nextDueInDays: 8,
    notes: "Box 20 m2, décors des Villes invisibles.",
  },
  {
    label: "Studio de repetition",
    category: "Local",
    amount: 420,
    frequency: "Mensuel",
    nextDueInDays: 25,
    notes: "Convention avec la maison de quartier.",
  },
  {
    label: "Logiciels et outils",
    category: "Logiciel",
    amount: 360,
    frequency: "Annuel",
    nextDueInDays: 95,
    notes: "Compta, stockage cloud, billetterie ponctuelle.",
  },
];

export const demoTreasury = {
  balance: 14250,
  note: "Solde après paie de juin et acompte Le Grand T.",
};

export const demoDocuments: DemoDocument[] = [
  { showKey: "villes", title: "Affiche 2026", documentType: "Affiche", status: "Pret", notes: "Version HD imprimeur." },
  { showKey: "villes", title: "Dossier artistique v4", documentType: "Dossier artistique", status: "Pret", notes: "Relu par toute l'équipe." },
  { showKey: "villes", title: "Note d'intention", documentType: "Note d'intention", status: "Pret", notes: "" },
  { showKey: "villes", title: "Synopsis", documentType: "Synopsis", status: "Pret", notes: "" },
  { showKey: "villes", title: "Budget prévisionnel 26/27", documentType: "Budget", status: "A mettre a jour", notes: "Intégrer les 2 dates de Reze confirmées." },
  { showKey: "villes", title: "Fiche technique", documentType: "Fiche technique", status: "Pret", notes: "Version salle + version exterieur." },
  { showKey: "villes", title: "RIB compagnie", documentType: "RIB", status: "Pret", notes: "" },
  { showKey: "villes", title: "Statuts association", documentType: "Statuts", status: "Pret", notes: "Statuts à jour AG 2025." },
  { showKey: "freres", title: "Dossier de création", documentType: "Dossier artistique", status: "Pret", notes: "Version travail pour les residences." },
  { showKey: "freres", title: "Note d'intention", documentType: "Note d'intention", status: "Pret", notes: "" },
  { showKey: "freres", title: "Budget de création", documentType: "Budget", status: "A mettre a jour", notes: "En attente des devis décors." },
  { showKey: "cabaret", title: "Affiche ete", documentType: "Affiche", status: "Pret", notes: "" },
  { showKey: "cabaret", title: "Fiche technique trio", documentType: "Fiche technique", status: "Pret", notes: "Autonome en son pour l'exterieur." },
];

export const demoQuotes: DemoQuote[] = [
  {
    number: "DEV-2026-001",
    opportunityTitle: "Les Villes invisibles - Reze - 2 dates",
    title: "Les Villes invisibles - Reze - 2 representations",
    organization: "Théâtre municipal de Rezé",
    amount: 8400,
    depositDue: 2520,
    balanceDue: 5880,
    status: "Acompte attendu",
    dueInDays: 15,
  },
  {
    number: "DEV-2026-002",
    opportunityTitle: "Les Villes invisibles - Le Grand T - saison 26/27",
    title: "Les Villes invisibles - Le Grand T - option 2 dates",
    organization: "Le Grand T",
    amount: 9600,
    depositDue: 2880,
    balanceDue: 6720,
    status: "Envoye",
    dueInDays: 25,
  },
  {
    number: "DEV-2026-003",
    opportunityTitle: "Cabaret des solstices - fete de l'Erdre",
    title: "Cabaret des solstices - fete de l'Erdre",
    organization: "Communaute de communes Erdre et Gesvres",
    amount: 3200,
    depositDue: 960,
    balanceDue: 2240,
    status: "A preparer",
    dueInDays: 30,
  },
];

const standardGrantPieces: ShowDocumentType[] = [
  "Dossier artistique",
  "Note d'intention",
  "Budget",
  "RIB",
  "Statuts",
];

export const demoGrants: DemoGrant[] = [
  {
    title: "Aide au projet spectacle vivant",
    funder: "DRAC Pays de la Loire",
    territory: "Pays de la Loire",
    discipline: "Theatre",
    deadlineInDays: 21,
    amount: 10000,
    status: "En montage",
    showKey: "villes",
    requirements: [...standardGrantPieces, "Fiche technique"],
    eligibility: "Dossier en cours : il manque le budget à jour avant depot.",
    sourceUrl:
      "https://www.culture.gouv.fr/catalogue-des-demarches-et-subventions/subvention/aide-au-projet-ou-au-fonctionnement-spectacle-vivant-et-arts-visuels",
  },
  {
    title: "Soutien aux projets culturels de proximite",
    funder: "Ville de Nantes",
    territory: "Nantes",
    discipline: "Toutes disciplines",
    deadlineInDays: 40,
    amount: 4000,
    status: "A surveiller",
    showKey: "cabaret",
    requirements: standardGrantPieces,
    eligibility: "Campagne annuelle, vérifier la date d'ouverture du guichet.",
    sourceUrl: "https://metropole.nantes.fr/subventions",
  },
  {
    title: "Aide a la création jeune public",
    funder: "Adami",
    territory: "France",
    discipline: "Jeune public",
    deadlineInDays: 60,
    amount: 6000,
    status: "Depose",
    showKey: "freres",
    requirements: standardGrantPieces,
    eligibility: "Depose le mois dernier, commission dans 2 mois environ.",
    sourceUrl: "https://www.adami.fr/suis-porteurde-projet/les-aides/",
  },
  {
    title: "Aide aux projets - tournee 2026",
    funder: "SPEDIDAM",
    territory: "France",
    discipline: "Musique",
    deadlineInDays: -30,
    amount: 4500,
    status: "Attribue",
    showKey: "cabaret",
    requirements: standardGrantPieces,
    eligibility: "Aide obtenue : 4 500 EUR pour la tournee d'ete du Cabaret.",
    sourceUrl: "https://www.spedidam.fr/aides-aux-projets/calendrier-des-commissions/",
  },
];

type DemoPatronageDeal = {
  companyName: string;
  contactName: string;
  amount: number;
  status: PatronageStatus;
  nextAction: string;
  nextFollowUpInDays: number | null;
};

export const demoPatronageDeals: DemoPatronageDeal[] = [
  {
    companyName: "Fondation Ouest Mécénat",
    contactName: "Thomas Vidal",
    amount: 8000,
    status: "Negociation",
    nextAction: "Envoyer la convention de mécénat avec contreparties",
    nextFollowUpInDays: 5,
  },
  {
    companyName: "Menuiserie Ateliers du Sillon",
    contactName: "Karine Lebreton",
    amount: 3000,
    status: "Argumentaire",
    nextAction: "Presenter l'argument fiscal 60% et le pack visibilite",
    nextFollowUpInDays: 11,
  },
  {
    companyName: "Groupe Loire Assurances",
    contactName: "Herve Sauvage",
    amount: 5000,
    status: "Prospect",
    nextAction: "Obtenir un rendez-vous via le reseau du CA",
    nextFollowUpInDays: 20,
  },
];

export function demoDate(days: number) {
  return dateAfterDays(days);
}
