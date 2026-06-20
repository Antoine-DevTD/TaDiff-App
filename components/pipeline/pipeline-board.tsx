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
import {
  createReminder,
  scheduleOpportunityFollowUp,
  updateOpportunityStage,
} from "@/app/(dashboard)/actions";
import { OpportunityEditor } from "@/components/pipeline/opportunity-editor";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  buildPipelineEmailDraft,
  getDefaultProbability,
  getPipelinePriorityScore,
  getPipelineSignal,
  pipelineStages,
} from "@/lib/pipeline";
import type { Contact, PipelineDeal, PipelineStage, Show } from "@/types";

type PipelineFilter = "all" | "open" | "follow-up" | "high-value";

export function PipelineBoard({
  contacts,
  deals,
  shows,
}: {
  contacts: Contact[];
  deals: PipelineDeal[];
  shows: Show[];
}) {
  const [optimisticDeals, setOptimisticDeals] = useState(deals);
  const [filter, setFilter] = useState<PipelineFilter>("all");
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

  const visibleDeals = useMemo(() => {
    return optimisticDeals
      .filter((deal) => {
        if (filter === "open") {
          return deal.stage !== "Confirme" && deal.stage !== "Perdu";
        }

        if (filter === "follow-up") {
          return ["danger", "warning"].includes(getPipelineSignal(deal).tone);
        }

        if (filter === "high-value") {
          return deal.value >= 8000 && deal.probability >= 50;
        }

        return true;
      })
      .sort((a, b) => getPipelinePriorityScore(b) - getPipelinePriorityScore(a));
  }, [filter, optimisticDeals]);

  const priorityDeals = useMemo(
    () =>
      optimisticDeals
        .filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu")
        .sort((a, b) => getPipelinePriorityScore(b) - getPipelinePriorityScore(a))
        .slice(0, 3),
    [optimisticDeals],
  );

  function moveDeal(id: string, stage: PipelineStage) {
    setOptimisticDeals((current) =>
      current.map((deal) =>
        deal.id === id
          ? { ...deal, stage, probability: getDefaultProbability(stage) }
          : deal,
      ),
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

      <Card className="grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold">Mode de lecture</p>
          <p className="mt-1 text-xs text-muted">
            Filtrez le pipeline pour traiter en premier les opportunites qui demandent une action.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: "all", label: "Tout" },
              { id: "open", label: "Actifs" },
              { id: "follow-up", label: "A relancer" },
              { id: "high-value", label: "Fort potentiel" },
            ].map((item) => (
              <button
                key={item.id}
                className={
                  filter === item.id
                    ? "rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                }
                type="button"
                onClick={() => setFilter(item.id as PipelineFilter)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-background/45 p-3">
          <p className="text-sm font-semibold">Priorites recommandees</p>
          <div className="mt-3 space-y-2">
            {priorityDeals.length === 0 ? (
              <p className="text-xs text-muted">Aucune opportunite active a prioriser.</p>
            ) : (
              priorityDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-muted">{deal.title}</span>
                  <span className="shrink-0 font-medium text-foreground">
                    {Math.max(getPipelinePriorityScore(deal), 0).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-6">
          {pipelineStages.map((stage) => {
            const stageDeals = visibleDeals.filter((deal) => deal.stage === stage.id);
            return (
              <PipelineColumn
                key={stage.id}
                count={stageDeals.length}
                stage={stage.id}
                label={stage.label}
              >
                {stageDeals.map((deal) => (
                  <PipelineCard
                    key={deal.id}
                    contacts={contacts}
                    deal={deal}
                    disabled={isPending}
                    shows={shows}
                    onDelete={(id) =>
                      setOptimisticDeals((current) => current.filter((item) => item.id !== id))
                    }
                    onMove={moveDeal}
                    onUpdate={(updatedDeal) =>
                      setOptimisticDeals((current) =>
                        current.map((item) => (item.id === updatedDeal.id ? updatedDeal : item)),
                      )
                    }
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
  count,
  label,
  stage,
}: {
  children: React.ReactNode;
  count: number;
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
        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs text-muted">
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PipelineCard({
  contacts,
  deal,
  disabled,
  shows,
  onDelete,
  onMove,
  onUpdate,
}: {
  contacts: Contact[];
  deal: PipelineDeal;
  disabled: boolean;
  shows: Show[];
  onDelete: (id: string) => void;
  onMove: (id: string, stage: PipelineStage) => void;
  onUpdate: (deal: PipelineDeal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const signal = getPipelineSignal(deal);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isReminderPending, startReminderTransition] = useTransition();
  const [isSchedulePending, startScheduleTransition] = useTransition();

  async function createQuickReminder() {
    const dueDate =
      deal.nextFollowUpAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    startReminderTransition(async () => {
      const result = await createReminder({
        title: deal.nextAction || `Relancer ${deal.contactName}`,
        dueDate,
        relatedTo: deal.title,
        priority: signal.tone === "danger" ? "high" : "normal",
        opportunityId: deal.id,
      });

      setMessage(result.message);
    });
  }

  async function copyEmailDraft() {
    await navigator.clipboard.writeText(buildPipelineEmailDraft(deal));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function scheduleFollowUp(days: 3 | 7) {
    startScheduleTransition(async () => {
      const result = await scheduleOpportunityFollowUp(deal.id, days);
      setMessage(result.message);

      if (result.ok && result.dueDate) {
        onUpdate({
          ...deal,
          stage: deal.stage === "A qualifier" ? "Relance prevue" : deal.stage,
          nextFollowUpAt: result.dueDate,
        });
      }
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
        {deal.lostReason ? (
          <p className="rounded-md bg-danger/10 p-2 text-danger">Perdu : {deal.lostReason}</p>
        ) : null}
      </div>

      {isEditing ? (
        <OpportunityEditor
          contacts={contacts}
          deal={deal}
          onCancel={() => setIsEditing(false)}
          onDelete={onDelete}
          onSaved={(updatedDeal, resultMessage) => {
            onUpdate(updatedDeal);
            setIsEditing(false);
            setMessage(resultMessage);
          }}
          shows={shows}
        />
      ) : null}

      <div className="mt-3 grid gap-2">
        <Select
          className="min-h-9 text-xs"
          disabled={disabled}
          value={deal.stage}
          onChange={(event) => onMove(deal.id, event.target.value as PipelineStage)}
        >
          {pipelineStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </Select>
        <button
          className="rounded-md bg-accent/20 px-2 py-2 text-xs text-foreground hover:bg-accent/30"
          disabled={isReminderPending}
          type="button"
          onClick={createQuickReminder}
        >
          {isReminderPending ? "Creation..." : "Relancer"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-md bg-white/5 px-2 py-2 text-xs text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-50"
            disabled={isSchedulePending}
            type="button"
            onClick={() => scheduleFollowUp(3)}
          >
            J+3
          </button>
          <button
            className="rounded-md bg-white/5 px-2 py-2 text-xs text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-50"
            disabled={isSchedulePending}
            type="button"
            onClick={() => scheduleFollowUp(7)}
          >
            J+7
          </button>
        </div>
        <button
          className="rounded-md bg-white/5 px-2 py-2 text-xs text-muted hover:bg-white/10 hover:text-foreground"
          type="button"
          onClick={() => setIsEditing((current) => !current)}
        >
          {isEditing ? "Fermer edition" : "Modifier"}
        </button>
        <button
          className="rounded-md bg-white/5 px-2 py-2 text-xs text-muted hover:bg-white/10 hover:text-foreground"
          type="button"
          onClick={copyEmailDraft}
        >
          {copied ? "Email copie" : "Copier email"}
        </button>
        {message ? <p className="text-xs text-muted">{message}</p> : null}
      </div>
    </article>
  );
}
