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
    body: "Je vous fais visiter TaDiff en 3 minutes : comprendre votre situation, voir les risques, savoir quoi faire. Cette visite est guidee et scriptee - le William assistant, capable de repondre librement, arrive dans une prochaine version.",
  },
  {
    id: "pulse",
    path: "/dashboard",
    target: "cockpit-pulse",
    title: "Votre situation en un regard",
    body: "Quatre questions, quatre reponses : est-ce qu'on tient, qu'est-ce qui vend, qu'est-ce qui bloque, qu'est-ce qui presse. La tresorerie, la diffusion et les dossiers sont calcules depuis vos vraies donnees.",
  },
  {
    id: "priorite",
    path: "/dashboard",
    target: "cockpit-priorite",
    title: "La priorite du jour",
    body: "TaDiff choisit l'action la plus urgente : une relance en retard, une subvention qui ferme, un devis a suivre. Un clic et vous etes au bon endroit.",
  },
  {
    id: "plan",
    path: "/dashboard",
    target: "cockpit-plan",
    title: "Le plan de route",
    body: "Les 5 sorties utiles de la journee, classees par urgence. Si tout est vert ici, la compagnie est a jour.",
  },
  {
    id: "diffusion",
    path: "/pipeline",
    target: "diffusion-creation",
    title: "La diffusion",
    body: "Chaque date possible avance ici : a qualifier, contacte, relance, negociation, confirme. Vous creez une date, TaDiff planifie la relance et calcule le chiffre d'affaires pondere.",
  },
  {
    id: "spectacles",
    path: "/shows",
    target: "shows-catalogue",
    title: "Les spectacles",
    body: "Le spectacle est le dossier central : affiche, pieces du dossier, structure de couts, rentabilite par date. Chaque fiche indique si le dossier est pret a etre depose ou envoye.",
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
    body: "Solde saisi, frais fixes, encaissements attendus : TaDiff projette a 30, 60 et 90 jours et vous donne la date ou ca se tend. En phrases claires, pas en tableaux.",
  },
  {
    id: "calendrier",
    path: "/calendar",
    target: "calendrier-avenir",
    title: "Le calendrier",
    body: "Relances, dates de spectacle, deadlines de subventions et frais fixes dans une seule vue. Rien ne sort du radar.",
  },
  {
    id: "fin",
    path: "/dashboard",
    target: null,
    title: "A vous de jouer",
    body: "Tout ce que vous venez de voir fonctionne vraiment : chaque bouton agit sur vos donnees. La checklist Commencer vous accompagne de votre premier spectacle jusqu'a votre premiere relance.",
  },
];
