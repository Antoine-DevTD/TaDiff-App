import type { PipelineDeal, PipelineStage } from "@/types";

export const pipelineStages: Array<{
  id: PipelineStage;
  label: string;
  probability: number;
  accent: string;
}> = [
  { id: "A qualifier", label: "A qualifier", probability: 15, accent: "bg-muted" },
  { id: "Contacte", label: "Contacte", probability: 30, accent: "bg-blue-400" },
  { id: "Relance prevue", label: "Action prevue", probability: 45, accent: "bg-warning" },
  { id: "Negociation", label: "Negociation", probability: 65, accent: "bg-accent" },
  { id: "Confirme", label: "Confirme", probability: 100, accent: "bg-success" },
  { id: "Perdu", label: "Perdu", probability: 0, accent: "bg-danger" },
];

export function getDefaultProbability(stage: PipelineStage) {
  return pipelineStages.find((item) => item.id === stage)?.probability ?? 20;
}

export function getPipelineSignal(input: {
  nextFollowUpAt: string;
  probability: number;
  value: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null;

  if (due && due < today) {
    return { label: "Action en retard", tone: "danger" as const };
  }

  if (due && due.getTime() - today.getTime() <= 3 * 24 * 60 * 60 * 1000) {
    return { label: "Action proche", tone: "warning" as const };
  }

  if (input.value >= 10000 && input.probability >= 50) {
    return { label: "Fort potentiel", tone: "success" as const };
  }

  return { label: "Suivi actif", tone: "neutral" as const };
}

export function getPipelinePriorityScore(deal: PipelineDeal) {
  const signal = getPipelineSignal(deal);
  const weightedValue = Math.round((deal.value * deal.probability) / 100);
  const overdueBoost = signal.tone === "danger" ? 5000 : 0;
  const upcomingBoost = signal.tone === "warning" ? 2500 : 0;
  const missingActionPenalty =
    !deal.nextAction || deal.nextAction === "Prochaine action a definir" ? -1500 : 0;
  const stageBoost = deal.stage === "Negociation" ? 1200 : deal.stage === "Relance prevue" ? 800 : 0;

  if (deal.stage === "Perdu" || deal.stage === "Confirme") {
    return weightedValue;
  }

  return weightedValue + overdueBoost + upcomingBoost + stageBoost + missingActionPenalty;
}

export function getPipelineRecommendation(deal: PipelineDeal) {
  const signal = getPipelineSignal(deal);

  if (deal.stage === "Confirme") {
    return {
      title: "Consolider",
      detail: "Preparez contrat, fiche technique et jalons de production.",
      tone: "success" as const,
    };
  }

  if (deal.stage === "Perdu") {
    return {
      title: "Capitaliser",
      detail: deal.lostReason
        ? "Gardez le motif de perte pour affiner les prochaines prospections."
        : "Ajoutez le motif de perte pour enrichir la lecture commerciale.",
      tone: "neutral" as const,
    };
  }

  if (signal.tone === "danger") {
    return {
      title: "Agir maintenant",
      detail: "Cette date est en retard : appelez ou envoyez un mail court aujourd'hui.",
      tone: "danger" as const,
    };
  }

  if (!deal.nextAction || deal.nextAction === "Prochaine action a definir") {
    return {
      title: "Qualifier l'action",
      detail: "Definissez une action precise : appel, dossier, devis ou rendez-vous.",
      tone: "warning" as const,
    };
  }

  if (!deal.nextFollowUpAt) {
    return {
      title: "Planifier",
      detail: "Ajoutez une date de prochaine action pour eviter que le dossier sorte du radar.",
      tone: "warning" as const,
    };
  }

  if (deal.stage === "A qualifier") {
    return {
      title: "Qualifier",
      detail: "Validez budget, calendrier et interlocuteur avant d'investir du temps commercial.",
      tone: "neutral" as const,
    };
  }

  if (deal.stage === "Negociation") {
    return {
      title: "Fermer les points ouverts",
      detail: "Envoyez une proposition claire sur date, budget et conditions d'accueil.",
      tone: "success" as const,
    };
  }

  if (deal.value >= 8000 && deal.probability >= 50) {
    return {
      title: "Accelerer",
      detail: "Fort potentiel : proposez un prochain rendez-vous ou une option de date.",
      tone: "success" as const,
    };
  }

  return {
    title: "Suivre",
    detail: "Gardez le dossier actif avec une prochaine etape courte et datee.",
    tone: "neutral" as const,
  };
}

export function getPipelineInsights(deals: PipelineDeal[]) {
  const activeDeals = deals.filter((deal) => deal.stage !== "Perdu" && deal.stage !== "Confirme");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = activeDeals.filter((deal) => {
    if (!deal.nextFollowUpAt) return false;
    const due = new Date(deal.nextFollowUpAt);
    return due < today;
  });

  const missingNextAction = activeDeals.filter(
    (deal) => !deal.nextAction || deal.nextAction === "Prochaine action a definir",
  );

  const highPotential = activeDeals
    .filter((deal) => deal.value >= 8000 && deal.probability >= 50)
    .sort((a, b) => b.value * b.probability - a.value * a.probability)
    .slice(0, 3);

  const weightedTotal = activeDeals.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );

  const topWeightedDeal = activeDeals
    .map((deal) => ({
      deal,
      weighted: Math.round((deal.value * deal.probability) / 100),
    }))
    .sort((a, b) => b.weighted - a.weighted)[0];

  const concentration =
    topWeightedDeal && weightedTotal > 0
      ? Math.round((topWeightedDeal.weighted / weightedTotal) * 100)
      : 0;

  return [
    {
      id: "overdue",
      title: "Actions en retard",
      value: overdue.length,
      detail:
        overdue.length > 0
          ? `${overdue[0].title} doit etre traite en premier`
          : "Aucun retard d'action",
      tone: overdue.length > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      id: "missing-action",
      title: "Sans prochaine action",
      value: missingNextAction.length,
      detail:
        missingNextAction.length > 0
          ? "Ajoutez une action concrete pour eviter les dates dormantes"
          : "Toutes les dates ont une prochaine action",
      tone: missingNextAction.length > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      id: "high-potential",
      title: "Dates prioritaires",
      value: highPotential.length,
      detail:
        highPotential[0]?.title ??
        "Aucune date a fort potentiel pour le moment",
      tone: highPotential.length > 0 ? ("success" as const) : ("neutral" as const),
    },
    {
      id: "concentration",
      title: "Concentration CA",
      value: `${concentration}%`,
      detail:
        concentration >= 60
          ? `Risque concentre sur ${topWeightedDeal?.deal.title}`
          : "Dates correctement reparties",
      tone: concentration >= 60 ? ("warning" as const) : ("neutral" as const),
    },
  ];
}

export function buildPipelineEmailDraft(deal: PipelineDeal) {
  const greetingName = deal.contactName && deal.contactName !== "Contact a renseigner"
    ? deal.contactName.split(" ")[0]
    : "bonjour";
  const showTitle =
    deal.showTitle && deal.showTitle !== "Spectacle a associer"
      ? deal.showTitle
      : "notre spectacle";

  if (deal.stage === "A qualifier") {
    return [
      `Bonjour ${greetingName},`,
      "",
      `Je me permets de vous contacter au sujet de ${showTitle}.`,
      "Je pense que cette proposition pourrait trouver sa place dans votre programmation, selon vos axes de saison.",
      "",
      "Seriez-vous disponible pour un court echange afin de voir si cela peut correspondre a vos prochaines dates ?",
      "",
      "Bien cordialement,",
    ].join("\n");
  }

  if (deal.stage === "Relance prevue" || deal.stage === "Contacte") {
    return [
      `Bonjour ${greetingName},`,
      "",
      `Je reviens vers vous concernant ${showTitle}.`,
      deal.nextAction
        ? `Comme prochaine etape, je pensais : ${deal.nextAction}.`
        : "Je voulais savoir si vous aviez pu prendre connaissance du dossier.",
      "",
      "Je reste disponible pour vous envoyer des elements complementaires ou convenir d'un echange.",
      "",
      "Bien cordialement,",
    ].join("\n");
  }

  if (deal.stage === "Negociation") {
    return [
      `Bonjour ${greetingName},`,
      "",
      `Suite a nos echanges autour de ${showTitle}, je vous propose que nous avancions sur les points pratiques : calendrier, conditions d'accueil et budget.`,
      "",
      `A ce stade, l'enveloppe suivie est de ${deal.value.toLocaleString("fr-FR")} EUR.`,
      "Dites-moi ce qui vous conviendrait pour finaliser les prochaines etapes.",
      "",
      "Bien cordialement,",
    ].join("\n");
  }

  return [
    `Bonjour ${greetingName},`,
    "",
    `Je reviens vers vous au sujet de ${showTitle}.`,
    "Je reste a votre disposition pour toute precision.",
    "",
    "Bien cordialement,",
  ].join("\n");
}
