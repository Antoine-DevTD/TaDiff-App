"use client";

import { Building2, CheckCircle2, ChevronRight, CircleAlert, HandCoins, Mail, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { deletePatronageDeal } from "@/app/(dashboard)/actions";
import { PatronageForm } from "@/components/patronage/patronage-form";
import { PatronageStatusSelect } from "@/components/patronage/patronage-status-select";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { InlineDeleteButton } from "@/components/ui/inline-delete-button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";
import type { PatronageDeal } from "@/types";

type PatronageFilter = "priority" | "approach" | "discussion" | "signed";

const filters: Array<{ id: PatronageFilter; label: string; icon: typeof CircleAlert; matches: (deal: PatronageDeal) => boolean }> = [
  { id: "priority", label: "À faire avancer", icon: CircleAlert, matches: (deal) => deal.status !== "Signe" },
  { id: "approach", label: "À approcher", icon: Building2, matches: (deal) => deal.status === "Prospect" || deal.status === "Argumentaire" },
  { id: "discussion", label: "En discussion", icon: HandCoins, matches: (deal) => deal.status === "Negociation" },
  { id: "signed", label: "Signés", icon: CheckCircle2, matches: (deal) => deal.status === "Signe" },
];

export function PatronageWorkspace({ deals }: { deals: PatronageDeal[] }) {
  const [filter, setFilter] = useState<PatronageFilter>(deals.some(filters[0].matches) ? "priority" : "signed");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(deals[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const visibleDeals = useMemo(() => {
    const matcher = filters.find((item) => item.id === filter)?.matches ?? (() => true);
    const query = search.trim().toLowerCase();
    return deals.filter(matcher).filter((deal) => !query || [deal.companyName, deal.contactName, deal.nextAction].join(" ").toLowerCase().includes(query));
  }, [deals, filter, search]);
  const selectedDeal = visibleDeals.find((deal) => deal.id === selectedId) ?? visibleDeals[0] ?? null;
  const total = deals.reduce((sum, deal) => sum + deal.amount, 0);

  return <section className="space-y-4" aria-labelledby="patronage-workspace-title">
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Partenaires privés</p><h2 id="patronage-workspace-title" className="mt-2 text-2xl font-semibold">Les partenariats à faire avancer</h2><p className="mt-1 text-sm text-muted">Une entreprise, un contact, un montant et la prochaine étape.</p></div>
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted"><strong className="text-foreground">{formatCurrency(total)}</strong> visés</span><ButtonLink href="/campaigns" variant="secondary"><Mail className="mr-2 h-4 w-4" />Préparer un email</ButtonLink><Button type="button" onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Ajouter</Button></div>
    </header>

    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-panel-strong p-1">{filters.map((item) => { const Icon = item.icon; const count = deals.filter(item.matches).length; return <button key={item.id} aria-pressed={filter === item.id} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded px-3 text-sm font-medium transition", filter === item.id ? "bg-panel text-foreground shadow-sm" : "text-muted hover:text-foreground")} type="button" onClick={() => setFilter(item.id)}><Icon className="h-4 w-4" />{item.label}<span className="rounded-full bg-panel-strong px-1.5 py-0.5 text-[11px]">{count}</span></button>; })}</div>
      <label className="relative block lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><span className="sr-only">Rechercher un partenaire</span><Input className="pl-9" placeholder="Entreprise ou contact" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    </div>

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(26rem,1.08fr)]">
      <Card className="overflow-hidden p-0">
        {visibleDeals.length > 0 ? <div className="divide-y divide-border">{visibleDeals.map((deal) => <button key={deal.id} aria-pressed={selectedDeal?.id === deal.id} className={cn("relative flex w-full items-center gap-3 px-4 py-4 text-left transition before:absolute before:inset-y-0 before:left-0 before:w-1 before:origin-bottom before:scale-y-0 before:bg-accent before:transition-transform", selectedDeal?.id === deal.id ? "bg-accent/[0.055] before:scale-y-100" : "hover:bg-panel-strong/45 hover:before:scale-y-100")} type="button" onClick={() => setSelectedId(deal.id)}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent/10 font-semibold text-accent">{deal.companyName.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate font-semibold">{deal.companyName}</p><Badge tone={toneFor(deal)}>{labelFor(deal)}</Badge></div><p className="mt-1 truncate text-sm text-muted">{deal.contactName || "Contact à renseigner"}</p><p className="mt-2 text-xs font-medium">{formatCurrency(deal.amount)}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted" /></button>)}</div> : <div className="p-8 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-success" /><p className="mt-3 font-semibold">Aucun partenaire dans cette vue</p><p className="mt-1 text-sm text-muted">Changez de filtre ou ajoutez une entreprise.</p></div>}
      </Card>
      {selectedDeal ? <PatronageFocus deal={selectedDeal} /> : <Card className="flex min-h-72 flex-col items-center justify-center border-dashed text-center"><HandCoins className="h-6 w-6 text-accent" /><p className="mt-3 font-semibold">Choisissez un partenaire</p><p className="mt-1 text-sm text-muted">Le montant et la prochaine étape apparaîtront ici.</p></Card>}
    </div>
    <Dialog className="max-w-2xl" description="Ajoutez l'entreprise et la prochaine étape utile." eyebrow="Mécénat" open={creating} title="Ajouter un partenaire" onClose={() => setCreating(false)}><PatronageForm /></Dialog>
  </section>;
}

function PatronageFocus({ deal }: { deal: PatronageDeal }) {
  return <Card className="overflow-hidden p-0 xl:sticky xl:top-24"><div className="border-b border-border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Partenaire actif</p><h3 className="mt-2 text-xl font-semibold">{deal.companyName}</h3><p className="mt-1 text-sm text-muted">{deal.contactName || "Contact à renseigner"}</p></div><Badge tone={toneFor(deal)}>{labelFor(deal)}</Badge></div><div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border"><InfoCell label="Montant visé" value={formatCurrency(deal.amount)} /><InfoCell label="Après réduction fiscale" value={formatCurrency(Math.round(deal.amount * 0.4))} /></div></div><div className="space-y-5 p-5"><section><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Prochaine étape</p><p className="mt-2 text-sm">{deal.nextAction || "Définir la prochaine action"}</p><p className="mt-1 text-xs text-muted">{deal.nextFollowUpAt ? new Date(`${deal.nextFollowUpAt}T12:00:00`).toLocaleDateString("fr-FR") : "Aucune date prévue"}</p></section><section className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2"><div><p className="mb-1 text-xs font-medium text-muted">Avancement</p><PatronageStatusSelect dealId={deal.id} status={deal.status} /></div><ButtonLink href="/campaigns" variant="secondary"><Mail className="mr-2 h-4 w-4" />Écrire au contact</ButtonLink></section><div className="border-t border-border pt-4"><InlineDeleteButton action={deletePatronageDeal.bind(null, deal.id)} label="Retirer" /></div></div></Card>;
}

function InfoCell({ label, value }: { label: string; value: string }) { return <div className="min-w-0 bg-panel p-3"><p className="text-[11px] text-muted">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>; }
function labelFor(deal: PatronageDeal) { if (deal.status === "Negociation") return "En discussion"; if (deal.status === "Signe") return "Signé"; if (deal.status === "Argumentaire") return "À préparer"; return "À approcher"; }
function toneFor(deal: PatronageDeal) { if (deal.status === "Signe") return "success" as const; if (deal.status === "Negociation") return "warning" as const; return "neutral" as const; }
