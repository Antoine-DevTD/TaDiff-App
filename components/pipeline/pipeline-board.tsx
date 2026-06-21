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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  buildPipelineEmailDraft,
  getDefaultProbability,
  getPipelinePriorityScore,
  getPipelineRecommendation,
  getPipelineSignal,
  pipelineStages,
} from "@/lib/pipeline";
import type { Contact, PipelineDeal, PipelineStage, Show } from "@/types";

type PipelineFilter = "all" | "open" | "follow-up" | "high-value";
type PipelineView = "board" | "list";

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
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PipelineView>("board");
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
    const normalizedSearch = search.trim().toLowerCase();

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
      .filter((deal) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          deal.title,
          deal.contactName,
          deal.contactOrganization,
          deal.showTitle,
          deal.venue,
          deal.nextAction,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => getPipelinePriorityScore(b) - getPipelinePriorityScore(a));
  }, [filter, optimisticDeals, search]);

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
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Mode de lecture</p>
            <div className="grid grid-cols-2 rounded-md border border-white/10 bg-white/5 p-1 text-xs">
              {[
                { id: "board", label: "Kanban" },
                { id: "list", label: "Liste" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={
                    view === item.id
                      ? "rounded bg-accent px-2 py-1 font-medium text-white"
                      : "rounded px-2 py-1 text-muted hover:text-foreground"
                  }
                  type="button"
                  onClick={() => setView(item.id as PipelineView)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">
            Filtrez le pipeline pour traiter en premier les opportunites qui demandent une action.
          </p>
          <div className="mt-3 space-y-3">
            <Input
              aria-label="Rechercher dans le pipeline"
              className="min-h-10"
              placeholder="Rechercher contact, lieu, spectacle..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
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
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span>
                {visibleDeals.length} resultat{visibleDeals.length > 1 ? "s" : ""} sur{" "}
                {optimisticDeals.length}
              </span>
              {search || filter !== "all" ? (
                <button
                  className="text-foreground hover:text-accent-strong"
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Reinitialiser
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-background/45 p-3">
          <p className="text-sm font-semibold">Priorites recommandees</p>
          <div className="mt-3 space-y-2">
            {priorityDeals.length === 0 ? (
              <p className="text-xs text-muted">Aucune opportunite active a prioriser.</p>
            ) : (
              priorityDeals.map((deal) => (
                <div key={deal.id} className="rounded-md bg-white/[0.04] p-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-muted">{deal.title}</span>
                    <span className="shrink-0 font-medium text-foreground">
                      {Math.max(getPipelinePriorityScore(deal), 0).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground">{getPipelineRecommendation(deal).title}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {visibleDeals.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="font-medium">Aucune opportunite ne correspond.</p>
            <p className="mt-2 text-sm text-muted">
              Ajustez la recherche ou revenez a la vue complete du pipeline.
            </p>
            <button
              className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Voir tout le pipeline
            </button>
          </Card>
        ) : view === "list" ? (
          <PipelineListView deals={visibleDeals} disabled={isPending} onMove={moveDeal} />
        ) : (
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
        )}
      </DndContext>
    </div>
  );
}

function PipelineListView({
  deals,
  disabled,
  onMove,
}: {
  deals: PipelineDeal[];
  disabled: boolean;
  onMove: (id: string, stage: PipelineStage) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Opportunite</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Etape</th>
              <th className="px-4 py-3 font-medium">Relance</th>
              <th className="px-4 py-3 text-right font-medium">CA pondere</th>
              <th className="px-4 py-3 text-right font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Action conseillee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {deals.map((deal) => {
              const signal = getPipelineSignal(deal);
              const recommendation = getPipelineRecommendation(deal);
              const weightedValue = Math.round((deal.value * deal.probability) / 100);

              return (
                <tr key={deal.id} className="align-top hover:bg-white/[0.03]">
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{deal.title}</p>
                    <p className="mt-1 text-xs text-muted">{deal.showTitle}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-foreground">{deal.contactName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {deal.contactOrganization || deal.venue}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <Select
                      className="min-h-9 min-w-40 text-xs"
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
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={signal.tone}>{signal.label}</Badge>
                    <p className="mt-2 text-xs text-muted">
                      {deal.nextFollowUpAt
                        ? new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR")
                        : "Non planifiee"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-medium">
                    {weightedValue.toLocaleString("fr-FR")} EUR
                    <p className="mt-1 text-xs text-muted">
                      {deal.value.toLocaleString("fr-FR")} EUR - {deal.probability}%
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-medium">
                    {Math.max(getPipelinePriorityScore(deal), 0).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{recommendation.title}</p>
                    <p className="mt-1 max-w-64 text-xs leading-5 text-muted">
                      {recommendation.detail}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
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
  const recommendation = getPipelineRecommendation(deal);
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
        <div className="rounded-md border border-white/10 bg-background/45 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{recommendation.title}</p>
            <Badge tone={recommendation.tone}>Action</Badge>
          </div>
          <p className="mt-1 leading-5">{recommendation.detail}</p>
        </div>
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
