import type { Contact, PipelineDeal, Reminder, Show } from "@/types";

export const shows: Show[] = [
  {
    id: "show-1",
    title: "Les lignes de fuite",
    discipline: "Theatre contemporain",
    status: "En diffusion",
    nextDate: "2026-09-18",
    budget: 12500,
  },
  {
    id: "show-2",
    title: "Cendres claires",
    discipline: "Danse et musique",
    status: "Creation",
    nextDate: "2026-11-04",
    budget: 18400,
  },
  {
    id: "show-3",
    title: "Le cabinet des songes",
    discipline: "Jeune public",
    status: "En pause",
    nextDate: "2027-01-12",
    budget: 9200,
  },
];

export const contacts: Contact[] = [
  {
    id: "contact-1",
    name: "Mina Laurent",
    organization: "Scene nationale du Littoral",
    role: "Programmatrice",
    city: "La Rochelle",
    status: "En discussion",
  },
  {
    id: "contact-2",
    name: "Arthur Klein",
    organization: "Festival Passages",
    role: "Direction artistique",
    city: "Metz",
    status: "Prospect",
  },
  {
    id: "contact-3",
    name: "Sofia Moreau",
    organization: "Theatre du Nord",
    role: "Chargee de diffusion",
    city: "Lille",
    status: "Partenaire",
  },
];

export const pipelineDeals: PipelineDeal[] = [
  {
    id: "deal-1",
    title: "Accueil plateau automne",
    venue: "Maison de la Culture",
    stage: "Negociation",
    value: 7800,
  },
  {
    id: "deal-2",
    title: "Serie scolaire",
    venue: "Theatre municipal",
    stage: "Contacte",
    value: 5400,
  },
  {
    id: "deal-3",
    title: "Coproduction creation",
    venue: "Scene nationale",
    stage: "A qualifier",
    value: 15000,
  },
];

export const reminders: Reminder[] = [
  {
    id: "reminder-1",
    label: "Relancer Mina apres envoi du dossier",
    dueDate: "2026-06-24",
    relatedTo: "Les lignes de fuite",
  },
  {
    id: "reminder-2",
    label: "Preparer devis serie scolaire",
    dueDate: "2026-06-28",
    relatedTo: "Theatre municipal",
  },
  {
    id: "reminder-3",
    label: "Mettre a jour le dossier de production",
    dueDate: "2026-07-02",
    relatedTo: "Cendres claires",
  },
];

export const dashboardStats = [
  { label: "Spectacles actifs", value: "3", detail: "2 en diffusion" },
  { label: "Prospects ouverts", value: "42", detail: "+8 ce mois" },
  { label: "Relances a venir", value: "11", detail: "4 cette semaine" },
  { label: "CA previsionnel", value: "48 900 EUR", detail: "Pipeline qualifie" },
];
