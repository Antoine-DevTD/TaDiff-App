"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  createQuoteFromOpportunity,
  createReminder,
  scheduleOpportunityFollowUp,
  updateOpportunityStage,
} from "@/app/(dashboard)/actions";
import { OpportunityEditor } from "@/components/pipeline/opportunity-editor";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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

  const activeDeals = optimisticDeals.filter(
    (deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu",
  );
  const lateFollowUps = optimisticDeals.filter(
    (deal) => getPipelineSignal(deal).tone === "danger",
  ).length;

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
      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">A traiter maintenant</p>
            {priorityDeals[0] ? (
              <div className="mt-2">
                <p className="text-lg font-semibold">{priorityDeals[0].title}</p>
                <p className="mt-1 text-sm text-muted">
                  {getPipelineRecommendation(priorityDeals[0]).title} -{" "}
                  {priorityDeals[0].contactName}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Aucune date active a prioriser.</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-panel-strong/65 p-2 text-center">
            <Metric label="Actives" value={activeDeals.length.toString()} />
            <Metric label="En retard" value={lateFollowUps.toString()} />
            <Metric label="Prevision" value={`${totals.weighted.toLocaleString("fr-FR")} EUR`} />
          </div>
        </div>
      </Card>

      {priorityDeals.length > 0 ? (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Priorites du jour</p>
              <p className="mt-1 text-xs text-muted">
                Traitez en priorite les dossiers avec relance proche, en retard ou fort potentiel.
              </p>
            </div>
            <ButtonLink href="/reminders" variant="secondary">
              Ouvrir les relances
            </ButtonLink>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {priorityDeals.map((deal) => (
              <PriorityDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            aria-label="Rechercher dans la diffusion"
            className="min-h-10 lg:max-w-xl"
            placeholder="Rechercher un contact, un lieu, un spectacle..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="grid w-full grid-cols-2 rounded-md border border-border bg-panel-strong p-1 text-xs lg:w-auto">
            {[
              { id: "board", label: "Kanban" },
              { id: "list", label: "Liste" },
            ].map((item) => (
              <button
                key={item.id}
                className={
                  view === item.id
                    ? "rounded bg-accent px-3 py-1.5 font-medium text-white"
                    : "rounded px-3 py-1.5 text-muted hover:bg-panel hover:text-foreground"
                }
                type="button"
                onClick={() => setView(item.id as PipelineView)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                  : "rounded-full border border-border bg-panel px-3 py-1.5 text-xs text-muted hover:bg-panel-strong hover:text-foreground"
              }
              type="button"
              onClick={() => setFilter(item.id as PipelineFilter)}
            >
              {item.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 text-xs text-muted">
            <span>
              {visibleDeals.length} resultat{visibleDeals.length > 1 ? "s" : ""}
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
      </Card>

      <details className="rounded-lg border border-border bg-panel p-4 text-sm">
        <summary className="cursor-pointer list-none font-semibold">
          Chiffres de diffusion
          <span className="ml-2 text-xs font-normal text-muted">
            {totals.raw.toLocaleString("fr-FR")} EUR total
          </span>
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border bg-panel-strong/55 p-3">
            <p className="text-xs text-muted">Dates ouvertes</p>
            <p className="mt-1 text-lg font-semibold">{totals.raw.toLocaleString("fr-FR")} EUR</p>
          </div>
          <div className="rounded-md border border-border bg-panel-strong/55 p-3">
            <p className="text-xs text-muted">Prevision ponderee</p>
            <p className="mt-1 text-lg font-semibold">
              {totals.weighted.toLocaleString("fr-FR")} EUR
            </p>
          </div>
          <div className="rounded-md border border-border bg-panel-strong/55 p-3">
            <p className="text-xs text-muted">Dossiers suivis</p>
            <p className="mt-1 text-lg font-semibold">{optimisticDeals.length}</p>
          </div>
        </div>
      </details>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {visibleDeals.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="font-medium">Aucune date ne correspond.</p>
            <p className="mt-2 text-sm text-muted">
              Ajustez la recherche ou revenez a la vue complete de diffusion.
            </p>
            <button
              className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Voir toute la diffusion
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PriorityDealCard({ deal }: { deal: PipelineDeal }) {
  const signal = getPipelineSignal(deal);
  const recommendation = getPipelineRecommendation(deal);
  const weightedValue = Math.round((deal.value * deal.probability) / 100);

  return (
    <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{deal.title}</p>
          <p className="mt-1 truncate text-sm text-muted">{deal.contactName}</p>
        </div>
        <Badge tone={signal.tone}>{signal.label}</Badge>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="text-xs text-muted">CA pondere</p>
          <p className="font-semibold">{weightedValue.toLocaleString("fr-FR")} EUR</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Relance</p>
          <p className="font-medium">
            {deal.nextFollowUpAt
              ? new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR")
              : "A planifier"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm text-foreground">{recommendation.title}</p>
      <p className="mt-1 text-xs text-muted">{deal.nextAction || "Prochaine action a definir"}</p>
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
          <thead className="border-b border-border bg-panel-strong/60 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date possible</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Etape</th>
              <th className="px-4 py-3 font-medium">Relance</th>
              <th className="px-4 py-3 text-right font-medium">CA pondere</th>
              <th className="px-4 py-3 text-right font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Action conseillee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deals.map((deal) => {
              const signal = getPipelineSignal(deal);
              const recommendation = getPipelineRecommendation(deal);
              const weightedValue = Math.round((deal.value * deal.probability) / 100);

              return (
                <tr key={deal.id} className="align-top hover:bg-panel-strong/45">
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
          : "min-h-72 rounded-lg border border-border bg-panel-strong/55 p-3"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="rounded-full bg-panel px-2 py-0.5 text-xs text-muted">
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
  const weightedValue = Math.round((deal.value * deal.probability) / 100);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isReminderPending, startReminderTransition] = useTransition();
  const [isQuotePending, startQuoteTransition] = useTransition();
  const [isSchedulePending, startScheduleTransition] = useTransition();
  const router = useRouter();

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

  function openEmailDraft() {
    const subject = `Relance - ${deal.showTitle || deal.title}`;
    const body = buildPipelineEmailDraft(deal);
    const to = deal.contactEmail ? encodeURIComponent(deal.contactEmail) : "";

    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function createQuote() {
    startQuoteTransition(async () => {
      const result = await createQuoteFromOpportunity(deal.id);
      setMessage(result.message);

      if (result.ok) {
        router.push("/billing");
        router.refresh();
      }
    });
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
      className="rounded-lg border border-border bg-panel p-3 shadow-sm shadow-ink/5 transition hover:border-accent/35 hover:shadow-md hover:shadow-accent/5"
    >
      <div
        className="flex cursor-grab items-start justify-between gap-3 active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">{deal.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <Link className="hover:text-accent" href={`/shows/${deal.showId}`}>
              {deal.showTitle}
            </Link>
            <span>-</span>
            <Link className="hover:text-accent" href={`/contacts/${deal.contactId}`}>
              {deal.contactName}
            </Link>
          </div>
        </div>
        <Badge tone={signal.tone}>{signal.label}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border bg-panel-strong/45 p-2 text-xs">
        <InfoCell label="Montant" value={`${deal.value.toLocaleString("fr-FR")} EUR`} />
        <InfoCell label="Probabilite" value={`${deal.probability}%`} />
        <InfoCell label="Pondere" value={`${weightedValue.toLocaleString("fr-FR")} EUR`} />
      </div>

      <div className="mt-3 space-y-2 text-xs text-muted">
        <p>{deal.contactOrganization || deal.venue}</p>
        <div className="rounded-md border border-border bg-panel-strong/55 p-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Prochaine action</p>
          <p className="mt-1 text-sm text-foreground">
            {deal.nextAction || "Prochaine action a definir"}
          </p>
        </div>
        {deal.nextFollowUpAt ? (
          <p className="font-medium text-foreground">
            Relance {new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR")}
          </p>
        ) : null}
        {deal.lostReason ? (
          <p className="rounded-md bg-danger/10 p-2 text-danger">Perdu : {deal.lostReason}</p>
        ) : null}
        <div className="rounded-md border border-border bg-panel-strong/55 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{recommendation.title}</p>
            <Badge tone={recommendation.tone}>Action</Badge>
          </div>
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
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-md bg-accent px-2 py-2 text-xs font-medium text-white hover:bg-accent-strong disabled:opacity-50"
            disabled={isReminderPending}
            type="button"
            onClick={createQuickReminder}
          >
            {isReminderPending ? "Creation..." : "Relancer"}
          </button>
          <button
            className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:opacity-50"
            disabled={isSchedulePending}
            type="button"
            onClick={() => scheduleFollowUp(7)}
          >
            Planifier
          </button>
        </div>
        <button
          className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground"
          type="button"
          onClick={() => setShowActions((current) => !current)}
        >
          {showActions ? "Masquer les options" : "Options"}
        </button>
        {showActions ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:opacity-50"
                disabled={isSchedulePending}
                type="button"
                onClick={() => scheduleFollowUp(3)}
              >
                J+3
              </button>
              <button
                className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:opacity-50"
                disabled={isSchedulePending}
                type="button"
                onClick={() => scheduleFollowUp(7)}
              >
                J+7
              </button>
            </div>
            <button
              className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground"
              type="button"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? "Fermer edition" : "Modifier"}
            </button>
            <button
              className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground"
              type="button"
              onClick={copyEmailDraft}
            >
              {copied ? "Email copie" : "Copier email"}
            </button>
            <button
              className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground"
              type="button"
              onClick={openEmailDraft}
            >
              Ouvrir email
            </button>
            <button
              className="rounded-md bg-panel-strong px-2 py-2 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:opacity-50"
              disabled={isQuotePending}
              type="button"
              onClick={createQuote}
            >
              {isQuotePending ? "Devis..." : "Creer devis"}
            </button>
          </>
        ) : null}
        {message ? <p className="text-xs text-muted">{message}</p> : null}
      </div>
    </article>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted">{label}</p>
      <p className="mt-1 truncate font-medium text-foreground">{value}</p>
    </div>
  );
}
