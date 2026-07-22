"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ChevronRight, CircleAlert, FileArchive, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteGrantOpportunity } from "@/app/(dashboard)/actions";
import { GrantDossierZipButton } from "@/components/grants/grant-dossier-zip-button";
import { GrantRequirementSlot } from "@/components/grants/grant-requirement-slot";
import { GrantShowSelect } from "@/components/grants/grant-show-select";
import { GrantStatusSelect } from "@/components/grants/grant-status-select";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineDeleteButton } from "@/components/ui/inline-delete-button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/finance";
import { getDossierReadinessPercent, getDossierTone, type GrantDossierState } from "@/lib/grants";
import { cn } from "@/lib/utils";
import type { GrantOpportunity, Show } from "@/types";

type GrantFilter = "priority" | "building" | "ready" | "done";

const grantFilters: Array<{ id: GrantFilter; label: string; icon: typeof CircleAlert; matches: (state: GrantDossierState) => boolean }> = [
  { id: "priority", label: "À traiter", icon: CircleAlert, matches: (state) => isUrgent(state.grant) && !isFinished(state.grant) },
  { id: "building", label: "À préparer", icon: FileArchive, matches: (state) => !isFinished(state.grant) && (state.missingCount > 0 || state.updateCount > 0) },
  { id: "ready", label: "Prêts à déposer", icon: CheckCircle2, matches: (state) => !isFinished(state.grant) && state.missingCount === 0 && state.updateCount === 0 },
  { id: "done", label: "Déposés / attribués", icon: CalendarClock, matches: (state) => isFinished(state.grant) },
];

export function GrantsWorkspace({ initialFocusId, shows, states }: { initialFocusId?: string; shows: Show[]; states: GrantDossierState[] }) {
  const initialState = states.find((state) => state.grant.id === initialFocusId);
  const initialFilter = initialState
    ? grantFilters.find((item) => item.matches(initialState))?.id ?? "building"
    : states.some(grantFilters[0].matches) ? "priority" : "building";
  const [filter, setFilter] = useState<GrantFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(initialFocusId || states[0]?.grant.id || "");
  const visibleStates = useMemo(() => {
    const matcher = grantFilters.find((item) => item.id === filter)?.matches ?? (() => true);
    const query = search.trim().toLowerCase();
    return states.filter(matcher).filter((state) => !query || [state.grant.funder, state.grant.title, state.grant.territory, state.show?.title].filter(Boolean).join(" ").toLowerCase().includes(query)).sort((a, b) => a.grant.deadline.localeCompare(b.grant.deadline));
  }, [filter, search, states]);
  const selectedState = visibleStates.find((state) => state.grant.id === selectedId) ?? visibleStates[0] ?? null;
  const groups = useMemo(() => {
    const entries = new Map<string, { title: string; items: GrantDossierState[] }>();
    visibleStates.forEach((state) => {
      const id = state.show?.id ?? "company";
      const group = entries.get(id) ?? { title: state.show?.title ?? "Compagnie", items: [] };
      group.items.push(state);
      entries.set(id, group);
    });
    return Array.from(entries.entries());
  }, [visibleStates]);

  return <section className="space-y-4" aria-labelledby="grants-workspace-title">
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Aides à la création et à la diffusion</p><h2 id="grants-workspace-title" className="mt-2 text-2xl font-semibold">Les prochains dossiers à faire avancer</h2><p className="mt-1 text-sm text-muted">Une échéance, un spectacle et les pièces réellement attendues.</p></div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><StatusCount label="urgents" value={states.filter(grantFilters[0].matches).length} /><StatusCount label="prêts" value={states.filter(grantFilters[2].matches).length} /><StatusCount label="pièces manquantes" value={states.reduce((sum, state) => sum + state.missingCount, 0)} /></div>
    </header>

    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-panel-strong p-1">{grantFilters.map((item) => { const Icon = item.icon; const count = states.filter(item.matches).length; return <button key={item.id} aria-pressed={filter === item.id} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded px-3 text-sm font-medium transition", filter === item.id ? "bg-panel text-foreground shadow-sm" : "text-muted hover:text-foreground")} type="button" onClick={() => setFilter(item.id)}><Icon className="h-4 w-4" />{item.label}<span className="rounded-full bg-panel-strong px-1.5 py-0.5 text-[11px]">{count}</span></button>; })}</div>
      <label className="relative block lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><span className="sr-only">Rechercher une aide</span><Input className="pl-9" placeholder="Organisme, spectacle, territoire" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    </div>

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(26rem,1.08fr)]">
      <Card className="overflow-hidden p-0">
        {groups.length > 0 ? groups.map(([id, group], index) => <section key={id} className={cn(index > 0 && "border-t border-border")}><div className="bg-panel-strong/45 px-4 py-2.5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{group.title}</p></div><div className="divide-y divide-border">{group.items.map((state) => <GrantRowButton key={state.grant.id} active={selectedState?.grant.id === state.grant.id} state={state} onSelect={() => setSelectedId(state.grant.id)} />)}</div></section>) : <div className="p-8 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-success" /><p className="mt-3 font-semibold">Aucun dossier dans cette vue</p><p className="mt-1 text-sm text-muted">Passez à une autre étape ou ajoutez une aide à suivre.</p></div>}
      </Card>
      {selectedState ? <GrantFocus shows={shows} state={selectedState} /> : <Card className="flex min-h-72 flex-col items-center justify-center border-dashed text-center"><FileArchive className="h-6 w-6 text-accent" /><p className="mt-3 font-semibold">Choisissez un dossier</p><p className="mt-1 text-sm text-muted">Les pièces demandées et les commandes apparaîtront ici.</p></Card>}
    </div>
  </section>;
}

function GrantRowButton({ active, onSelect, state }: { active: boolean; onSelect: () => void; state: GrantDossierState }) {
  return <button aria-pressed={active} className={cn("relative flex w-full items-center gap-3 px-4 py-4 text-left transition", "before:absolute before:inset-y-0 before:left-0 before:w-1 before:origin-bottom before:scale-y-0 before:bg-accent before:transition-transform", active ? "bg-accent/[0.055] before:scale-y-100" : "hover:bg-panel-strong/45 hover:before:scale-y-100")} type="button" onClick={onSelect}><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate font-semibold">{state.grant.funder}</p><Badge tone={getDeadlineTone(state.grant)}>{getDeadlineLabel(state.grant.deadline)}</Badge></div><p className="mt-1 truncate text-sm text-muted">{state.grant.title}</p><div className="mt-2 flex items-center gap-3 text-xs"><span className="font-medium">{formatCurrency(state.grant.amount)}</span><span className="text-muted">{state.readyCount}/{state.totalCount} pièces prêtes</span></div></div><ChevronRight className={cn("h-4 w-4 shrink-0 text-muted transition", active && "translate-x-0.5 text-accent")} /></button>;
}

function GrantFocus({ shows, state }: { shows: Show[]; state: GrantDossierState }) {
  const grant = state.grant;
  const readiness = getDossierReadinessPercent(state);
  return <Card className="overflow-hidden p-0 xl:sticky xl:top-24">
    <div className="border-b border-border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Dossier actif</p><h3 className="mt-2 text-xl font-semibold">{grant.funder}</h3><p className="mt-1 text-sm text-muted">{state.show?.title ?? grant.title}</p></div><Badge tone={getDeadlineTone(grant)}>{getDeadlineLabel(grant.deadline)}</Badge></div><div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border"><InfoCell label="Montant" value={formatCurrency(grant.amount)} /><InfoCell label="Territoire" value={grant.territory} /><InfoCell label="Échéance" value={new Date(`${grant.deadline}T12:00:00`).toLocaleDateString("fr-FR")} /></div></div>
    <div className="space-y-5 p-5">
      <section className="rounded-md border border-border bg-panel-strong/45 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Préparation</p><p className="mt-1 font-semibold">{state.missingCount === 0 && state.updateCount === 0 ? "Prêt à déposer" : `${state.missingCount} pièce(s) à ajouter`}</p></div><Badge tone={getDossierTone(state)}>{readiness}%</Badge></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${readiness}%` }} /></div></section>
      <section><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Pièces demandées</h4><GrantDossierZipButton state={state} /></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{state.requirements.map((requirement) => <GrantRequirementSlot key={requirement.type} requirement={requirement} showId={state.show?.id} showTitle={state.show?.title} />)}</div></section>
      <section className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2"><div><p className="mb-1 text-xs font-medium text-muted">Étape du dossier</p><GrantStatusSelect grantId={grant.id} status={grant.status} /></div><div><p className="mb-1 text-xs font-medium text-muted">Spectacle concerné</p><GrantShowSelect grantId={grant.id} initialShowId={state.show?.id ?? ""} shows={shows.map((show) => ({ id: show.id, title: show.title }))} /></div></section>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">{state.show ? <ButtonLink href={`/shows/${state.show.id}`} variant="secondary">Voir le spectacle</ButtonLink> : null}{grant.sourceUrl ? <Link className="text-sm font-medium text-accent hover:text-accent-strong" href={grant.sourceUrl} target="_blank">Source officielle ↗</Link> : null}<InlineDeleteButton action={deleteGrantOpportunity.bind(null, grant.id)} label="Retirer" /></div>
    </div>
  </Card>;
}

function InfoCell({ label, value }: { label: string; value: string }) { return <div className="min-w-0 bg-panel p-3"><p className="text-[11px] text-muted">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>; }
function StatusCount({ label, value }: { label: string; value: number }) { return <span><strong className="text-foreground">{value}</strong> {label}</span>; }
function startOfDay(date: Date) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function daysUntil(deadline: string) { return Math.round((startOfDay(new Date(deadline)).getTime() - startOfDay(new Date()).getTime()) / 86400000); }
function isUrgent(grant: GrantOpportunity) { return daysUntil(grant.deadline) <= 14; }
function isFinished(grant: GrantOpportunity) { return grant.status === "Depose" || grant.status === "Attribue"; }
function getDeadlineLabel(deadline: string) { const days = daysUntil(deadline); if (days < 0) return `${Math.abs(days)} j de retard`; if (days === 0) return "Aujourd'hui"; if (days <= 14) return `Dans ${days} j`; return new Date(`${deadline}T12:00:00`).toLocaleDateString("fr-FR"); }
function getDeadlineTone(grant: GrantOpportunity) { if (grant.status === "Attribue") return "success" as const; if (isFinished(grant)) return "neutral" as const; const days = daysUntil(grant.deadline); if (days < 0) return "danger" as const; if (days <= 14) return "warning" as const; return "neutral" as const; }
