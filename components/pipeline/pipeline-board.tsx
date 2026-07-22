"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FilePenLine,
  Mail,
  Pencil,
  PhoneCall,
  Search,
  Send,
  TicketCheck,
  UserPlus,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  createPerformanceInvitation,
  createQuoteFromOpportunity,
  createReminder,
  scheduleOpportunityFollowUp,
  updateOpportunityStage,
} from "@/app/(dashboard)/actions";
import { OpportunityEditor } from "@/components/pipeline/opportunity-editor";
import { PipelineAddCard } from "@/components/pipeline/pipeline-add-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  getExploitationModeLabel,
  getPipelineRecommendation,
  getPipelineSignal,
  pipelineStages,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import type { Contact, PipelineDeal, PipelineStage, Show } from "@/types";

type DiffusionFilter = "active" | "contact" | "discussion" | "confirmed" | "closed";

const filters: Array<{
  id: DiffusionFilter;
  label: string;
  icon: typeof CircleDot;
  matches: (deal: PipelineDeal) => boolean;
}> = [
  {
    id: "active",
    label: "À faire avancer",
    icon: CircleDot,
    matches: (deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu",
  },
  {
    id: "contact",
    label: "À contacter",
    icon: PhoneCall,
    matches: (deal) => deal.stage === "A qualifier" || deal.stage === "Contacte",
  },
  {
    id: "discussion",
    label: "En discussion",
    icon: Mail,
    matches: (deal) => deal.stage === "Relance prevue" || deal.stage === "Negociation",
  },
  {
    id: "confirmed",
    label: "Confirmées",
    icon: CheckCircle2,
    matches: (deal) => deal.stage === "Confirme",
  },
  {
    id: "closed",
    label: "Sans suite",
    icon: TicketCheck,
    matches: (deal) => deal.stage === "Perdu",
  },
];

export function PipelineBoard({
  contacts,
  deals,
  shows,
}: {
  contacts: Contact[];
  deals: PipelineDeal[];
  shows: Show[];
}) {
  const [items, setItems] = useState(deals);
  const [filter, setFilter] = useState<DiffusionFilter>("active");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(deals[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const visibleDeals = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matcher = filters.find((item) => item.id === filter)?.matches ?? (() => true);

    return items
      .filter(matcher)
      .filter((deal) => {
        if (!query) return true;
        return [deal.title, deal.showTitle, deal.contactName, deal.contactOrganization, deal.venue]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const dateA = a.nextFollowUpAt || a.performanceDate || "2999-12-31";
        const dateB = b.nextFollowUpAt || b.performanceDate || "2999-12-31";
        return dateA.localeCompare(dateB);
      });
  }, [filter, items, search]);

  const selectedDeal = visibleDeals.find((deal) => deal.id === selectedId) ?? visibleDeals[0] ?? null;
  const confirmedPerformances = items.filter(
    (deal) => deal.stage === "Confirme" && Boolean(deal.performanceDate),
  );

  function moveDeal(id: string, stage: PipelineStage) {
    setItems((current) => current.map((deal) => (
      deal.id === id
        ? { ...deal, stage, probability: pipelineStages.find((item) => item.id === stage)?.probability ?? deal.probability }
        : deal
    )));
    startTransition(async () => {
      await updateOpportunityStage(id, stage);
    });
  }

  return (
    <section className="space-y-4" aria-labelledby="diffusion-workspace-title">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Diffusion</p>
          <h2 id="diffusion-workspace-title" className="mt-2 text-2xl font-semibold">
            Faire circuler vos spectacles
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Retrouvez le bon contact, préparez le message, puis invitez-le à une représentation.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <StatusCount label="à contacter" value={items.filter(filters[1].matches).length} />
          <StatusCount label="en discussion" value={items.filter(filters[2].matches).length} />
          <StatusCount label="confirmées" value={items.filter(filters[3].matches).length} />
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-panel-strong p-1">
          {filters.map((item) => {
            const Icon = item.icon;
            const count = items.filter(item.matches).length;
            return (
              <button
                key={item.id}
                aria-pressed={filter === item.id}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded px-3 text-sm font-medium transition",
                  filter === item.id
                    ? "bg-panel text-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
                type="button"
                onClick={() => setFilter(item.id)}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
                <span className="rounded-full bg-panel-strong px-1.5 py-0.5 text-[11px]">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="relative block lg:w-80">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <span className="sr-only">Rechercher une diffusion</span>
          <Input className="pl-9" placeholder="Spectacle, lieu ou contact" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(25rem,1.08fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">
              {visibleDeals.length} dossier{visibleDeals.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="max-h-[44rem] divide-y divide-border overflow-y-auto">
            {visibleDeals.map((deal) => (
              <DiffusionRow
                key={deal.id}
                active={selectedDeal?.id === deal.id}
                deal={deal}
                show={shows.find((show) => show.id === deal.showId)}
                onSelect={() => setSelectedId(deal.id)}
              />
            ))}
            {visibleDeals.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-medium">Aucun dossier dans cette vue</p>
                <p className="mt-1 text-sm text-muted">Changez de filtre ou ajoutez une diffusion.</p>
              </div>
            ) : null}
          </div>
          <div className="border-t border-border p-3">
            <PipelineAddCard />
          </div>
        </Card>

        {selectedDeal ? (
          <DiffusionFocus
            contacts={contacts}
            confirmedPerformances={confirmedPerformances}
            deal={selectedDeal}
            disabled={isPending}
            shows={shows}
            onDelete={(id) => setItems((current) => current.filter((deal) => deal.id !== id))}
            onMove={moveDeal}
            onUpdate={(updatedDeal) => setItems((current) => current.map((deal) => deal.id === updatedDeal.id ? updatedDeal : deal))}
          />
        ) : (
          <Card className="flex min-h-72 flex-col items-center justify-center border-dashed text-center">
            <Send className="h-6 w-6 text-accent" />
            <p className="mt-3 font-semibold">Choisissez un dossier</p>
            <p className="mt-1 text-sm text-muted">Ses contacts, messages et invitations apparaîtront ici.</p>
          </Card>
        )}
      </div>
    </section>
  );
}

function DiffusionRow({ active, deal, onSelect, show }: { active: boolean; deal: PipelineDeal; onSelect: () => void; show?: Show }) {
  const signal = getPipelineSignal(deal);
  return (
    <button
      aria-pressed={active}
      className={cn(
        "group relative flex w-full items-center gap-3 px-4 py-4 text-left transition",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:origin-bottom before:scale-y-0 before:bg-accent before:transition-transform",
        active ? "bg-accent/[0.055] before:scale-y-100" : "hover:bg-panel-strong/45 hover:before:scale-y-100",
      )}
      type="button"
      onClick={onSelect}
    >
      <div
        aria-hidden="true"
        className="grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded border border-border bg-ink text-xs font-semibold text-white"
        style={show?.posterUrl ? { backgroundImage: `url(${show.posterUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
      >
        {show?.posterUrl ? null : deal.showTitle.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold">{deal.showTitle}</p>
          <Badge tone={signal.tone}>{pipelineStages.find((stage) => stage.id === deal.stage)?.label}</Badge>
        </div>
        <p className="mt-1 truncate text-sm text-muted">{deal.contactOrganization || deal.venue}</p>
        <p className="mt-2 truncate text-xs text-foreground">
          {deal.nextAction || getPipelineRecommendation(deal).detail}
        </p>
      </div>
      <ChevronRight aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-muted transition", active && "translate-x-0.5 text-accent")} />
    </button>
  );
}

function DiffusionFocus({ contacts, confirmedPerformances, deal, disabled, onDelete, onMove, onUpdate, shows }: {
  contacts: Contact[];
  confirmedPerformances: PipelineDeal[];
  deal: PipelineDeal;
  disabled: boolean;
  shows: Show[];
  onDelete: (id: string) => void;
  onMove: (id: string, stage: PipelineStage) => void;
  onUpdate: (deal: PipelineDeal) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const availablePerformances = confirmedPerformances.filter((item) => item.showId === deal.showId && item.id !== deal.id);
  const [performanceId, setPerformanceId] = useState(availablePerformances[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isActionPending, startActionTransition] = useTransition();
  const [isInvitePending, startInviteTransition] = useTransition();
  const [isQuotePending, startQuoteTransition] = useTransition();
  const signal = getPipelineSignal(deal);
  const recommendation = getPipelineRecommendation(deal);

  function createAction() {
    const dueDate = deal.nextFollowUpAt || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    startActionTransition(async () => {
      const result = await createReminder({
        title: deal.nextAction || `Contacter ${deal.contactName}`,
        dueDate,
        relatedTo: deal.title,
        priority: signal.tone === "danger" ? "high" : "normal",
        opportunityId: deal.id,
        showId: deal.showId,
        contactId: deal.contactId,
        actionType: "call",
      });
      setMessage(result.message);
    });
  }

  function prepareInvitation() {
    if (!performanceId) {
      setMessage("Choisissez d'abord une représentation confirmée.");
      return;
    }
    startInviteTransition(async () => {
      const result = await createPerformanceInvitation(deal.id, performanceId);
      if (!result.ok || !result.invitation) {
        setMessage(result.message);
        return;
      }
      const invitation = result.invitation;
      const body = [
        `Bonjour ${deal.contactName},`,
        "",
        `Je vous propose de découvrir ${deal.showTitle} le ${new Date(invitation.performanceDate).toLocaleDateString("fr-FR")}${invitation.venue ? ` à ${invitation.venue}` : ""}.`,
        "",
        `Pouvez-vous confirmer votre présence ici : ${invitation.url}`,
      ].join("\n");
      onUpdate({ ...deal, invitations: [invitation, ...(deal.invitations ?? []).filter((item) => item.id !== invitation.id)] });
      window.location.href = `mailto:${encodeURIComponent(deal.contactEmail ?? "")}?subject=${encodeURIComponent(invitation.subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  function schedule(days: 3 | 7) {
    startActionTransition(async () => {
      const result = await scheduleOpportunityFollowUp(deal.id, days);
      setMessage(result.message);
      if (result.ok && result.dueDate) onUpdate({ ...deal, nextFollowUpAt: result.dueDate });
    });
  }

  return (
    <Card className="overflow-hidden p-0 xl:sticky xl:top-24">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Dossier actif</p>
            <h3 className="mt-2 text-xl font-semibold">{deal.showTitle}</h3>
            <p className="mt-1 text-sm text-muted">{deal.contactName} · {deal.contactOrganization || deal.venue}</p>
          </div>
          <Badge tone={signal.tone}>{signal.label}</Badge>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <ButtonLink className="gap-2" href={`/campaigns?contactId=${deal.contactId}&showId=${deal.showId}`}>
            <Mail className="h-4 w-4" /> Écrire
          </ButtonLink>
          <Button className="gap-2" variant="secondary" type="button" onClick={() => setInviting((value) => !value)}>
            <UserPlus className="h-4 w-4" /> Inviter
          </Button>
          <Button className="gap-2" variant="secondary" disabled={isActionPending} type="button" onClick={createAction}>
            <CalendarDays className="h-4 w-4" /> Ajouter l&apos;action
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section aria-label="Étape de diffusion">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Où en est ce contact ?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pipelineStages.filter((stage) => stage.id !== "Perdu").map((stage) => (
              <button
                key={stage.id}
                aria-pressed={deal.stage === stage.id}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  deal.stage === stage.id ? "border-accent bg-accent text-white" : "border-border bg-panel hover:border-accent/40",
                )}
                disabled={disabled}
                type="button"
                onClick={() => onMove(deal.id, stage.id)}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
          <InfoCell label="Accord" value={getExploitationModeLabel(deal.exploitationMode)} />
          <InfoCell label="Recette estimée" value={`${deal.value.toLocaleString("fr-FR")} EUR`} />
          <InfoCell label="Représentation" value={deal.performanceDate ? new Date(deal.performanceDate).toLocaleDateString("fr-FR") : "À caler"} />
          <InfoCell label="Prochaine action" value={deal.nextFollowUpAt ? new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR") : "À planifier"} />
        </div>

        <section className="rounded-md border border-accent/25 bg-accent/[0.045] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-sm font-semibold text-white">T</span>
            <div>
              <p className="font-semibold">{recommendation.title}</p>
              <p className="mt-1 text-sm text-muted">{recommendation.detail}</p>
              <p className="mt-2 text-sm">{deal.nextAction || "Définissez la prochaine étape utile."}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={isActionPending} type="button" onClick={() => schedule(3)}>Dans 3 jours</Button>
            <Button variant="secondary" disabled={isActionPending} type="button" onClick={() => schedule(7)}>Dans 7 jours</Button>
          </div>
        </section>

        {inviting ? (
          <section className="rounded-md border border-border bg-panel-strong/45 p-4">
            <div className="flex items-center gap-2">
              <TicketCheck className="h-4 w-4 text-accent" />
              <p className="font-semibold">Inviter à une représentation</p>
            </div>
            {availablePerformances.length > 0 ? (
              <>
                <Select className="mt-3" aria-label="Représentation proposée" value={performanceId} onChange={(event) => setPerformanceId(event.target.value)}>
                  {availablePerformances.map((performance) => (
                    <option key={performance.id} value={performance.id}>
                      {new Date(performance.performanceDate).toLocaleDateString("fr-FR")} · {performance.venue}
                    </option>
                  ))}
                </Select>
                <Button className="mt-3 gap-2" disabled={isInvitePending} type="button" onClick={prepareInvitation}>
                  <Send className="h-4 w-4" /> Préparer l&apos;invitation
                </Button>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Confirmez d&apos;abord une date de ce spectacle pour pouvoir inviter ce contact.</p>
            )}
          </section>
        ) : null}

        {(deal.invitations?.length ?? 0) > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Invitations envoyées</p>
            <div className="mt-2 space-y-2">
              {deal.invitations?.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span>{new Date(invitation.performanceDate).toLocaleDateString("fr-FR")}</span>
                  <Badge tone={invitation.response === "yes" ? "success" : invitation.response === "no" ? "danger" : "neutral"}>
                    {getInvitationStatus(invitation)}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {editing ? (
          <OpportunityEditor contacts={contacts} deal={deal} shows={shows} onCancel={() => setEditing(false)} onDelete={onDelete} onSaved={(updated, resultMessage) => { onUpdate(updated); setEditing(false); setMessage(resultMessage); }} />
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button className="gap-2" variant="secondary" type="button" onClick={() => setEditing((value) => !value)}><Pencil className="h-4 w-4" /> Modifier</Button>
          <Button className="gap-2" variant="secondary" disabled={isQuotePending} type="button" onClick={() => startQuoteTransition(async () => { const result = await createQuoteFromOpportunity(deal.id); setMessage(result.message); if (result.ok) { router.push("/billing"); router.refresh(); } })}><FilePenLine className="h-4 w-4" /> Préparer un devis</Button>
          {deal.stage !== "Perdu" ? <Button variant="ghost" type="button" onClick={() => onMove(deal.id, "Perdu")}>Classer sans suite</Button> : null}
        </div>
        {message ? <p className="rounded-md bg-panel-strong px-3 py-2 text-sm text-muted" role="status">{message}</p> : null}
      </div>
    </Card>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-panel p-3"><p className="text-[11px] text-muted">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>;
}

function StatusCount({ label, value }: { label: string; value: number }) {
  return <span><strong className="text-foreground">{value}</strong> {label}</span>;
}

function getInvitationStatus(invitation: NonNullable<PipelineDeal["invitations"]>[number]) {
  if (invitation.response === "yes") return "Présence confirmée";
  if (invitation.response === "no") return "Ne viendra pas";
  if (invitation.linkOpenedAt || invitation.emailClickedAt) return "Lien consulté";
  if (invitation.emailOpenedAt) return "Mail ouvert";
  if (invitation.sentAt) return "Envoyée";
  return "Brouillon";
}
