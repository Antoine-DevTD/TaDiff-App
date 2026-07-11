// Parcours de la visite guidee "overview" presentee par William (version scriptee).
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
    body: "Je vous fais visiter TaDiff comme en rendez-vous demo : partir du cockpit, ouvrir un spectacle, verifier le dossier, suivre les dates et voir quoi faire ensuite. Cette visite est guidee et scriptee ; William IA arrivera plus tard.",
  },
  {
    id: "pulse",
    path: "/dashboard",
    target: "cockpit-pulse",
    title: "Votre situation en un regard",
    body: "Quatre questions, quatre reponses : est-ce qu'on tient, qu'est-ce qui vend, qu'est-ce qui bloque, qu'est-ce qui presse. Tresorerie, diffusion et dossiers sont calcules depuis les donnees de la compagnie.",
  },
  {
    id: "priorite",
    path: "/dashboard",
    target: "cockpit-priorite",
    title: "La priorite du jour",
    body: "TaDiff met en avant l'action la plus urgente : une relance en retard, une aide qui ferme, un devis a suivre ou un dossier incomplet. L'objectif est simple : savoir quoi faire maintenant.",
  },
  {
    id: "plan",
    path: "/dashboard",
    target: "cockpit-plan",
    title: "Le plan de route",
    body: "Les prochaines actions sont classees par urgence. Si tout est vert ici, la compagnie est a jour pour vendre, deposer et encaisser.",
  },
  {
    id: "spectacles",
    path: "/shows",
    target: "shows-catalogue",
    title: "Les spectacles",
    body: "Le spectacle est le dossier central : affiche, pieces indispensables, documents facultatifs, couts, rentabilite et dates liees. On ne vend pas une fiche, on pilote un spectacle.",
  },
  {
    id: "documents",
    path: "/documents",
    target: "documents-priorite",
    title: "Les dossiers de spectacle",
    body: "La page Documents rassemble les dossiers par spectacle. Les pieces indispensables font avancer le pourcentage ; budget, devis, RIB ou statuts restent disponibles comme documents facultatifs.",
  },
  {
    id: "contacts",
    path: "/contacts",
    target: "contacts-carnet",
    title: "Le carnet de diffusion",
    body: "Ici, on evite le mot CRM. Vous classez vos programmateurs et partenaires avec des tags simples : festival, theatre, mecenat, grande salle. La creation se fait sans quitter la page.",
  },
  {
    id: "diffusion",
    path: "/pipeline",
    target: "diffusion-creation",
    title: "La diffusion",
    body: "Chaque date possible avance ici : a qualifier, contacte, relance, negociation, confirme. La date de jeu est separee de la relance commerciale pour savoir quand on joue vraiment.",
  },
  {
    id: "subventions",
    path: "/subventions",
    target: "radar-subventions",
    title: "Le radar subventions",
    body: "Chaque dispositif suit sa deadline et ses pieces. Quand le dossier est pret, le bouton zip prepare le depot avec les vrais fichiers stockes dans TaDiff.",
  },
  {
    id: "finances",
    path: "/finances",
    target: "finance-tresorerie",
    title: "La tresorerie sans etre comptable",
    body: "Solde saisi, frais fixes, encaissements attendus : TaDiff projette a 30, 60 et 90 jours et vous donne la date ou ca se tend, en phrases claires.",
  },
  {
    id: "calendrier",
    path: "/calendar",
    target: "calendrier-avenir",
    title: "Le calendrier",
    body: "Relances, dates de spectacle, deadlines de subventions et frais fixes sont dans une seule lecture. Rien ne sort du radar.",
  },
  {
    id: "fin",
    path: "/dashboard",
    target: null,
    title: "A vous de jouer",
    body: "Pour une demo live, installez la compagnie de demonstration dans Parametres, puis lancez cette visite. Stripe peut attendre : la valeur a montrer maintenant, c'est le cockpit, les spectacles, les contacts, les dates et les dossiers.",
  },
];
