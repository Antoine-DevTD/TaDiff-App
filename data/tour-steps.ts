// Parcours de la visite guidee "overview" presentee par William.
// Chaque etape cible un element porteur d'un attribut data-tour sur la page indiquee ;
// target null = message centre sans spotlight.

export type TourStep = {
  id: string;
  path: string;
  target: string | null;
  title: string;
  body: string;
};

export const overviewTourSteps: TourStep[] = [
  {
    id: "bienvenue",
    path: "/dashboard",
    target: null,
    title: "Bienvenue, je suis William",
    body: "Je vous accompagne dans TaDiff : partir du cockpit, ouvrir un spectacle, vérifier le dossier, suivre les dates et voir quoi faire ensuite. L'objectif est simple : comprendre en quelques minutes comment piloter la compagnie.",
  },
  {
    id: "pulse",
    path: "/dashboard",
    target: "cockpit-pulse",
    title: "Votre situation en un regard",
    body: "Quatre questions, quatre réponses : est-ce qu'on tient, qu'est-ce qui vend, qu'est-ce qui bloque, qu'est-ce qui presse. Trésorerie, dates à vendre et dossiers sont calculés depuis les données de la compagnie.",
  },
  {
    id: "priorite",
    path: "/dashboard",
    target: "cockpit-priorite",
    title: "La priorite du jour",
    body: "TaDiff met en avant l'action la plus urgente : un appel en retard, une aide qui ferme, un devis a suivre ou un dossier incomplet. L'objectif est simple : savoir quoi faire maintenant.",
  },
  {
    id: "plan",
    path: "/dashboard",
    target: "cockpit-plan",
    title: "Le plan de route",
    body: "Les prochaines actions sont classées par urgence. Si tout est vert ici, la compagnie est à jour pour vendre, déposer et encaisser.",
  },
  {
    id: "spectacles",
    path: "/shows",
    target: "shows-catalogue",
    title: "Les spectacles",
    body: "Le spectacle est le dossier central : affiche, pièces indispensables, documents facultatifs, couts, rentabilite et dates liees. On ne vend pas une fiche, on pilote un spectacle.",
  },
  {
    id: "documents",
    path: "/documents",
    target: "documents-priorite",
    title: "Les dossiers de spectacle",
    body: "La page Documents rassemble les dossiers par spectacle. Les pièces indispensables font avancer le pourcentage ; budget, devis, RIB ou statuts restent disponibles comme documents facultatifs.",
  },
  {
    id: "contacts",
    path: "/contacts",
    target: "contacts-carnet",
    title: "Le carnet de contacts",
    body: "Ici, on évite le mot CRM. Vous classez vos programmateurs et partenaires avec des tags simples : festival, théâtre, mécénat, grande salle. La création se fait sans quitter la page.",
  },
  {
    id: "diffusion",
    path: "/pipeline",
    target: "diffusion-création",
    title: "Les dates a vendre",
    body: "Chaque ligne est une date possible : qui est interesse, combien ca vaut, quand on joue, et quelle action faire ensuite. On suit une vente de date, pas un tableau abstrait.",
  },
  {
    id: "subventions",
    path: "/subventions",
    target: "radar-subventions",
    title: "Le radar subventions",
    body: "Chaque dispositif suit sa deadline et ses pièces. Quand le dossier est pret, le bouton zip préparé le depot avec les vrais fichiers stockes dans TaDiff.",
  },
  {
    id: "finances",
    path: "/finances",
    target: "finance-trésorerie",
    title: "La trésorerie sans etre comptable",
    body: "Solde saisi, frais fixes, encaissements attendus : TaDiff projette a 30, 60 et 90 jours et vous donne la date ou ca se tend, en phrases claires.",
  },
  {
    id: "calendrier",
    path: "/calendar",
    target: "calendrier-avenir",
    title: "Le calendrier",
    body: "Actions a faire, dates de spectacle, deadlines de subventions et frais fixes sont dans une seule lecture. Rien ne sort du radar.",
  },
  {
    id: "fin",
    path: "/dashboard",
    target: null,
    title: "A vous de jouer",
    body: "Vous avez maintenant le fil principal : cockpit, spectacles, contacts, dates, dossiers et trésorerie. La prochaine étape consiste à ajouter vos propres données et à laisser TaDiff faire remonter les priorités.",
  },
];
