export const appName = "TaDiff";
export const pipelineCreateEvent = "tadiff:create-opportunity";

export type DashboardSectionId =
  | "today"
  | "shows"
  | "distribution"
  | "calendar"
  | "finances"
  | "files";

export type DashboardNavItem = {
  href: string;
  label: string;
  section: DashboardSectionId;
  summary: string;
};

export type DashboardSection = {
  href: string;
  id: DashboardSectionId;
  label: string;
  summary: string;
};

export const dashboardSections: DashboardSection[] = [
  {
    id: "today",
    href: "/dashboard",
    label: "Aujourd'hui",
    summary: "Priorites et actions",
  },
  {
    id: "shows",
    href: "/shows",
    label: "Spectacles",
    summary: "Catalogue et dossiers",
  },
  {
    id: "distribution",
    href: "/pipeline",
    label: "Diffuser",
    summary: "Dates et programmateurs",
  },
  {
    id: "calendar",
    href: "/calendar",
    label: "Agenda",
    summary: "Dates et echeances",
  },
  {
    id: "finances",
    href: "/finances",
    label: "Finances",
    summary: "Tresorerie et factures",
  },
  {
    id: "files",
    href: "/subventions",
    label: "Dossiers",
    summary: "Aides, contrats et pieces",
  },
];

export const dashboardNavItems: DashboardNavItem[] = [
  {
    section: "today",
    href: "/dashboard",
    label: "Vue d'ensemble",
    summary: "Etat de la compagnie",
  },
  {
    section: "today",
    href: "/reminders",
    label: "A faire",
    summary: "Actions du jour",
  },
  {
    section: "shows",
    href: "/shows",
    label: "Spectacles",
    summary: "Catalogue et dossiers",
  },
  {
    section: "distribution",
    href: "/pipeline",
    label: "Dates",
    summary: "Dates possibles et ventes",
  },
  {
    section: "distribution",
    href: "/contacts",
    label: "Programmateurs",
    summary: "Contacts et partenaires",
  },
  {
    section: "distribution",
    href: "/campaigns",
    label: "Emails",
    summary: "Envois et suivis",
  },
  {
    section: "calendar",
    href: "/calendar",
    label: "Agenda",
    summary: "Dates, echeances et frais",
  },
  {
    section: "finances",
    href: "/finances",
    label: "Tresorerie",
    summary: "Cash, frais fixes et projections",
  },
  {
    section: "finances",
    href: "/billing",
    label: "Devis et factures",
    summary: "Acomptes et soldes",
  },
  {
    section: "files",
    href: "/subventions",
    label: "Subventions",
    summary: "Dossiers et echeances",
  },
  {
    section: "files",
    href: "/mecenat",
    label: "Mecenat",
    summary: "Entreprises et contreparties",
  },
  {
    section: "files",
    href: "/documents",
    label: "Documents",
    summary: "Pieces pretes et manquantes",
  },
  {
    section: "files",
    href: "/contracts",
    label: "Contrats",
    summary: "Cessions et prestations",
  },
  {
    section: "files",
    href: "/settings",
    label: "Parametres",
    summary: "Compte et donnees",
  },
];

export function getDashboardItem(pathname: string) {
  return (
    dashboardNavItems.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
    ) ?? null
  );
}

export function getDashboardSection(pathname: string) {
  const currentItem = getDashboardItem(pathname);

  return (
    dashboardSections.find((section) => section.id === currentItem?.section) ??
    dashboardSections[0]
  );
}

export function getDashboardSectionItems(sectionId: DashboardSectionId) {
  return dashboardNavItems.filter(
    (item) => item.section === sectionId && item.href !== "/settings",
  );
}

export const publicNavItems = [
  { href: "/#produit", label: "Produit" },
  { href: "/#demonstration", label: "Demonstration" },
  { href: "/#calculateur", label: "Calculateur" },
  { href: "/pricing", label: "Tarifs" },
];
