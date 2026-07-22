"use client";

import { useState } from "react";
import { deleteOpportunity, updateOpportunity } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateCompanyRevenue,
  exploitationModes,
  getDefaultProbability,
  getWilliamOpportunityAction,
  pipelineStages,
} from "@/lib/pipeline";
import type { Contact, ExploitationMode, PipelineDeal, PipelineStage, Show } from "@/types";

export function OpportunityEditor({
  contacts,
  deal,
  onCancel,
  onDelete,
  onSaved,
  shows,
}: {
  contacts: Contact[];
  deal: PipelineDeal;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onSaved: (deal: PipelineDeal, message: string) => void;
  shows: Show[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: deal.title,
    contactId: deal.contactId,
    showId: deal.showId,
    stage: deal.stage,
    value: String(deal.value),
    probability: String(deal.probability),
    exploitationMode: deal.exploitationMode,
    cessionFee: String(deal.cessionFee),
    estimatedBoxOffice: String(deal.estimatedBoxOffice),
    companySharePercent: String(deal.companySharePercent),
    minimumGuarantee: String(deal.minimumGuarantee),
    venueRental: String(deal.venueRental),
    performanceDate: deal.performanceDate,
    nextAction: deal.nextAction === "Prochaine action a definir" ? "" : deal.nextAction,
    nextFollowUpAt: deal.nextFollowUpAt,
    lostReason: deal.lostReason,
  });

  function setDraftStage(stage: PipelineStage) {
    setDraft((current) => ({
      ...current,
      stage,
      probability: String(getDefaultProbability(stage)),
      lostReason: stage === "Perdu" ? current.lostReason : "",
    }));
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
    const revenue = calculateCompanyRevenue({
      exploitationMode: draft.exploitationMode,
      cessionFee: Number(draft.cessionFee) || 0,
      estimatedBoxOffice: Number(draft.estimatedBoxOffice) || 0,
      companySharePercent: Number(draft.companySharePercent) || 0,
      minimumGuarantee: Number(draft.minimumGuarantee) || 0,
      venueRental: Number(draft.venueRental) || 0,
    });

    onSaved(
      {
        ...deal,
        title: draft.title,
        contactId: draft.contactId,
        showId: draft.showId,
        venue: selectedContact?.organization ?? "Structure a renseigner",
        stage: draft.stage,
        value: revenue,
        probability: Number(draft.probability) || 0,
        exploitationMode: draft.exploitationMode,
        cessionFee: Number(draft.cessionFee) || 0,
        estimatedBoxOffice: Number(draft.estimatedBoxOffice) || 0,
        companySharePercent: Number(draft.companySharePercent) || 0,
        minimumGuarantee: Number(draft.minimumGuarantee) || 0,
        venueRental: Number(draft.venueRental) || 0,
        performanceDate: draft.performanceDate,
        nextAction: draft.nextAction || "Prochaine action a definir",
        nextFollowUpAt: draft.nextFollowUpAt,
        lostReason: draft.stage === "Perdu" ? draft.lostReason : "",
        contactName: selectedContact?.name ?? "Contact a renseigner",
        contactOrganization: selectedContact?.organization ?? "",
        showTitle: selectedShow?.title ?? "Spectacle a associer",
      },
      result.message,
    );
  }

  async function removeDeal() {
    const confirmed = window.confirm("Supprimer cette diffusion ?");

    if (!confirmed) {
      return;
    }

    const result = await deleteOpportunity(deal.id);
    setMessage(result.message);

    if (result.ok) {
      onDelete(deal.id);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border bg-panel-strong/55 p-3">
      <Input
        aria-label="Titre de la diffusion"
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
      <Select
        aria-label="Mode d'exploitation"
        className="min-h-9 text-xs"
        value={draft.exploitationMode}
        onChange={(event) => setDraft((current) => ({ ...current, exploitationMode: event.target.value as ExploitationMode }))}
      >
        {exploitationModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
      </Select>
      {draft.exploitationMode === "cession" || draft.exploitationMode === "other" ? (
        <Input aria-label="Montant attendu" className="min-h-9 text-xs" min="0" step="0.01" type="number" value={draft.cessionFee} onChange={(event) => setDraft((current) => ({ ...current, cessionFee: event.target.value }))} />
      ) : null}
      {draft.exploitationMode === "corealisation" ? (
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Billetterie estimée" className="min-h-9 text-xs" min="0" step="0.01" type="number" value={draft.estimatedBoxOffice} onChange={(event) => setDraft((current) => ({ ...current, estimatedBoxOffice: event.target.value }))} />
          <Input aria-label="Part compagnie" className="min-h-9 text-xs" min="0" max="100" step="5" type="number" value={draft.companySharePercent} onChange={(event) => setDraft((current) => ({ ...current, companySharePercent: event.target.value }))} />
          <Input aria-label="Minimum garanti" className="col-span-2 min-h-9 text-xs" min="0" step="0.01" type="number" value={draft.minimumGuarantee} onChange={(event) => setDraft((current) => ({ ...current, minimumGuarantee: event.target.value }))} />
        </div>
      ) : null}
      {draft.exploitationMode === "location" ? (
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Billetterie estimée" className="min-h-9 text-xs" min="0" step="0.01" type="number" value={draft.estimatedBoxOffice} onChange={(event) => setDraft((current) => ({ ...current, estimatedBoxOffice: event.target.value }))} />
          <Input aria-label="Coût de location" className="min-h-9 text-xs" min="0" step="0.01" type="number" value={draft.venueRental} onChange={(event) => setDraft((current) => ({ ...current, venueRental: event.target.value }))} />
        </div>
      ) : null}
      <Input
        aria-label="Date de jeu"
        className="min-h-9 text-xs"
        type="date"
        value={draft.performanceDate}
        onChange={(event) =>
          setDraft((current) => ({ ...current, performanceDate: event.target.value }))
        }
      />
      <Input
        aria-label="Date de prochaine action"
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
      <button
        className="w-full rounded-md border border-accent/25 bg-accent/5 px-2 py-2 text-xs font-medium text-accent hover:bg-accent/10"
        type="button"
        onClick={() => {
          const suggestion = getWilliamOpportunityAction(draft.stage, draft.exploitationMode);
          setDraft((current) => ({ ...current, nextAction: suggestion.action, nextFollowUpAt: suggestion.dueDate }));
        }}
      >
        Demander une action à William
      </button>
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
        <Button className="min-h-9 px-2 text-xs" type="button" variant="secondary" onClick={onCancel}>
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
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
