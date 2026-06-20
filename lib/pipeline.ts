import type { PipelineDeal, PipelineStage } from "@/types";

export const pipelineStages: Array<{
  id: PipelineStage;
  label: string;
  probability: number;
  accent: string;
}> = [
  { id: "A qualifier", label: "A qualifier", probability: 15, accent: "bg-muted" },
  { id: "Contacte", label: "Contacte", probability: 30, accent: "bg-blue-400" },
  { id: "Relance prevue", label: "Relance prevue", probability: 45, accent: "bg-warning" },
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
    return { label: "Relance en retard", tone: "danger" as const };
  }

  if (due && due.getTime() - today.getTime() <= 3 * 24 * 60 * 60 * 1000) {
    return { label: "Relance proche", tone: "warning" as const };
  }

  if (input.value >= 10000 && input.probability >= 50) {
    return { label: "Fort potentiel", tone: "success" as const };
  }

  return { label: "Suivi actif", tone: "neutral" as const };
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
      title: "Relances en retard",
      value: overdue.length,
      detail:
        overdue.length > 0
          ? `${overdue[0].title} doit etre traite en premier`
          : "Aucun retard de relance",
      tone: overdue.length > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      id: "missing-action",
      title: "Sans prochaine action",
      value: missingNextAction.length,
      detail:
        missingNextAction.length > 0
          ? "Ajoutez une action concrete pour eviter les opportunites dormantes"
          : "Toutes les opportunites ont une prochaine action",
      tone: missingNextAction.length > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      id: "high-potential",
      title: "Deals prioritaires",
      value: highPotential.length,
      detail:
        highPotential[0]?.title ??
        "Aucun deal fort potentiel pour le moment",
      tone: highPotential.length > 0 ? ("success" as const) : ("neutral" as const),
    },
    {
      id: "concentration",
      title: "Concentration CA",
      value: `${concentration}%`,
      detail:
        concentration >= 60
          ? `Risque concentre sur ${topWeightedDeal?.deal.title}`
          : "Pipeline correctement reparti",
      tone: concentration >= 60 ? ("warning" as const) : ("neutral" as const),
    },
  ];
}
