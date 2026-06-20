import type { PipelineStage } from "@/types";

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
