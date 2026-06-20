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
  deleteOpportunity,
  updateOpportunity,
  updateOpportunityStage,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPipelineEmailDraft,
  getDefaultProbability,
  getPipelineSignal,
  pipelineStages,
} from "@/lib/pipeline";
import type { Contact, PipelineDeal, PipelineStage, Show } from "@/types";

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

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-6">
          {pipelineStages.map((stage) => {
            const stageDeals = optimisticDeals.filter((deal) => deal.stage === stage.id);
            return (
              <PipelineColumn key={stage.id} stage={stage.id} label={stage.label}>
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
  const [draft, setDraft] = useState({
    title: deal.title,
    contactId: deal.contactId,
    showId: deal.showId,
    stage: deal.stage,
    value: String(deal.value),
    probability: String(deal.probability),
    nextAction: deal.nextAction === "Prochaine action a definir" ? "" : deal.nextAction,
    nextFollowUpAt: deal.nextFollowUpAt,
    lostReason: deal.lostReason,
  });

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

  async function copyEmailDraft() {
    await navigator.clipboard.writeText(buildPipelineEmailDraft(deal));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function saveDeal() {
    setMessage(null);
    const result = await updateOpportunity(deal.id, draft);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    const selectedContact = contacts.find((contact) => contact.id === draft.contactId);
    const selectedShow = shows.find((show) => show.id === draft.showId);
    const updatedDeal: PipelineDeal = {
      ...deal,
      title: draft.title,
      contactId: draft.contactId,
      showId: draft.showId,
      venue: selectedContact?.organization ?? "Structure a renseigner",
      stage: draft.stage,
      value: Number(draft.value) || 0,
      probability: Number(draft.probability) || 0,
      nextAction: draft.nextAction || "Prochaine action a definir",
      nextFollowUpAt: draft.nextFollowUpAt,
      lostReason: draft.stage === "Perdu" ? draft.lostReason : "",
      contactName: selectedContact?.name ?? "Contact a renseigner",
      contactOrganization: selectedContact?.organization ?? "",
      showTitle: selectedShow?.title ?? "Spectacle a associer",
    };

    onUpdate(updatedDeal);
    setIsEditing(false);
    setMessage(result.message);
  }

  async function removeDeal() {
    const confirmed = window.confirm("Supprimer cette opportunite du pipeline ?");

    if (!confirmed) {
      return;
    }

    const result = await deleteOpportunity(deal.id);
    setMessage(result.message);

    if (result.ok) {
      onDelete(deal.id);
    }
  }

  function setDraftStage(stage: PipelineStage) {
    setDraft((current) => ({
      ...current,
      stage,
      probability: String(getDefaultProbability(stage)),
      lostReason: stage === "Perdu" ? current.lostReason : "",
    }));
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
        <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-background/50 p-3">
          <Input
            aria-label="Titre opportunite"
            className="min-h-9 text-xs"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Select
              aria-label="Contact"
              className="min-h-9 text-xs"
              value={draft.contactId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, contactId: event.target.value }))
              }
            >
              <option value="">Aucun contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Spectacle"
              className="min-h-9 text-xs"
              value={draft.showId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, showId: event.target.value }))
              }
            >
              <option value="">Aucun spectacle</option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Montant"
              className="min-h-9 text-xs"
              min="0"
              step="100"
              type="number"
              value={draft.value}
              onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
            />
            <Input
              aria-label="Probabilite"
              className="min-h-9 text-xs"
              max="100"
              min="0"
              step="5"
              type="number"
              value={draft.probability}
              onChange={(event) =>
                setDraft((current) => ({ ...current, probability: event.target.value }))
              }
            />
          </div>
          <Input
            aria-label="Date de relance"
            className="min-h-9 text-xs"
            type="date"
            value={draft.nextFollowUpAt}
            onChange={(event) =>
              setDraft((current) => ({ ...current, nextFollowUpAt: event.target.value }))
            }
          />
          <Textarea
            aria-label="Prochaine action"
            className="min-h-16 text-xs"
            placeholder="Prochaine action"
            value={draft.nextAction}
            onChange={(event) =>
              setDraft((current) => ({ ...current, nextAction: event.target.value }))
            }
          />
          <Select
            aria-label="Etape"
            className="min-h-9 text-xs"
            value={draft.stage}
            onChange={(event) => setDraftStage(event.target.value as PipelineStage)}
          >
            {pipelineStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </Select>
          {draft.stage === "Perdu" ? (
            <Textarea
              aria-label="Raison de perte"
              className="min-h-16 text-xs"
              placeholder="Ex : budget trop eleve, mauvais timing, programmation complete..."
              value={draft.lostReason}
              onChange={(event) =>
                setDraft((current) => ({ ...current, lostReason: event.target.value }))
              }
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button className="min-h-9 px-2 text-xs" type="button" onClick={saveDeal}>
              Enregistrer
            </Button>
            <Button
              className="min-h-9 px-2 text-xs"
              type="button"
              variant="secondary"
              onClick={() => setIsEditing(false)}
            >
              Annuler
            </Button>
          </div>
          <button
            className="w-full rounded-md bg-danger/10 px-2 py-2 text-xs text-danger hover:bg-danger/15"
            type="button"
            onClick={removeDeal}
          >
            Supprimer
          </button>
        </div>
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
          type="button"
          onClick={createQuickReminder}
        >
          Relancer
        </button>
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
