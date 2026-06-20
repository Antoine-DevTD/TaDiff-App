"use client";

import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { useMemo, useState, useTransition } from "react";
import { createReminder, updateOpportunityStage } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPipelineSignal, pipelineStages } from "@/lib/pipeline";
import type { PipelineDeal, PipelineStage } from "@/types";

export function PipelineBoard({ deals }: { deals: PipelineDeal[] }) {
  const [optimisticDeals, setOptimisticDeals] = useState(deals);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const totals = useMemo(() => {
    return optimisticDeals.reduce(
      (acc, deal) => {
        acc.weighted += Math.round((deal.value * deal.probability) / 100);
        acc.raw += deal.value;
        return acc;
      },
      { raw: 0, weighted: 0 },
    );
  }, [optimisticDeals]);

  function moveDeal(id: string, stage: PipelineStage) {
    setOptimisticDeals((current) =>
      current.map((deal) => (deal.id === id ? { ...deal, stage } : deal)),
    );
    startTransition(async () => {
      await updateOpportunityStage(id, stage);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const dealId = String(event.active.id);
    const stage = event.over?.id as PipelineStage | undefined;

    if (stage) {
      moveDeal(dealId, stage);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted">Pipeline total</p>
          <p className="mt-2 text-2xl font-semibold">{totals.raw.toLocaleString("fr-FR")} EUR</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Prevision ponderee</p>
          <p className="mt-2 text-2xl font-semibold">
            {totals.weighted.toLocaleString("fr-FR")} EUR
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Opportunites actives</p>
          <p className="mt-2 text-2xl font-semibold">
            {optimisticDeals.filter((deal) => deal.stage !== "Perdu").length}
          </p>
        </Card>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-6">
          {pipelineStages.map((stage) => {
            const stageDeals = optimisticDeals.filter((deal) => deal.stage === stage.id);
            return (
              <PipelineColumn key={stage.id} stage={stage.id} label={stage.label}>
                {stageDeals.map((deal) => (
                  <PipelineCard
                    key={deal.id}
                    deal={deal}
                    disabled={isPending}
                    onMove={moveDeal}
                  />
                ))}
              </PipelineColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

function PipelineColumn({
  children,
  label,
  stage,
}: {
  children: React.ReactNode;
  label: string;
  stage: PipelineStage;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={
        isOver
          ? "min-h-72 rounded-lg border border-accent bg-accent/10 p-3"
          : "min-h-72 rounded-lg border border-border bg-ink/45 p-3"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PipelineCard({
  deal,
  disabled,
  onMove,
}: {
  deal: PipelineDeal;
  disabled: boolean;
  onMove: (id: string, stage: PipelineStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const signal = getPipelineSignal(deal);

  async function createQuickReminder() {
    const dueDate =
      deal.nextFollowUpAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await createReminder({
      title: deal.nextAction || `Relancer ${deal.contactName}`,
      dueDate,
      relatedTo: deal.title,
      priority: signal.tone === "danger" ? "high" : "normal",
      opportunityId: deal.id,
    });
  }

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className="rounded-lg border border-border bg-panel p-3 shadow-lg shadow-ink/20"
    >
      <div
        className="flex cursor-grab items-start justify-between gap-3 active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <div>
          <p className="font-semibold">{deal.title}</p>
          <p className="mt-1 text-xs text-muted">{deal.showTitle}</p>
        </div>
        <Badge tone={signal.tone}>{signal.label}</Badge>
      </div>

      <div className="mt-3 space-y-2 text-xs text-muted">
        <p>{deal.contactName}</p>
        <p>{deal.contactOrganization || deal.venue}</p>
        <p>{deal.value.toLocaleString("fr-FR")} EUR - {deal.probability}%</p>
        <p className="text-foreground">{deal.nextAction}</p>
        {deal.nextFollowUpAt ? (
          <p>Relance {new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR")}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pipelineStages
          .filter((stage) => stage.id !== deal.stage)
          .slice(0, 3)
          .map((stage) => (
            <button
              key={stage.id}
              className="rounded-md bg-white/5 px-2 py-1 text-xs text-muted hover:bg-white/10 hover:text-foreground"
              disabled={disabled}
              type="button"
              onClick={() => onMove(deal.id, stage.id)}
            >
              {stage.label}
            </button>
          ))}
        <button
          className="rounded-md bg-accent/20 px-2 py-1 text-xs text-foreground hover:bg-accent/30"
          type="button"
          onClick={createQuickReminder}
        >
          Relancer
        </button>
      </div>
    </article>
  );
}
