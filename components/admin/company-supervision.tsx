"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyBillingForm } from "@/components/admin/company-billing-form";
import { cn } from "@/lib/utils";
import {
  companyMatchesSearch,
  getSupervisionBillingLabel,
  getSupervisionRoleLabel,
  memberMatchesSearch,
  type AdminCompanySupervisionSnapshot,
  type AdminSupervisedCompany,
} from "@/lib/admin-supervision";

const emptyCompanies: AdminSupervisedCompany[] = [];

export function CompanySupervision({ snapshot, canManageBilling = false }: { snapshot: AdminCompanySupervisionSnapshot; canManageBilling?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const companies = snapshot.status === "ready" ? snapshot.companies : emptyCompanies;
  const filtered = useMemo(() => companies.filter((company) => companyMatchesSearch(company, query)
    && (accessFilter === "all" || company.hasAccess === (accessFilter === "open"))), [companies, query, accessFilter]);
  const memberTotal = companies.reduce((total, company) => total + company.memberCount, 0);
  const openAccessTotal = companies.filter((company) => company.hasAccess).length;
  const refresh = () => startTransition(() => router.refresh());

  function search(value: string) {
    setQuery(value);
    setExpanded(new Set(companies.filter((company) => company.members.some((member) => memberMatchesSearch(member, value))).map((company) => company.id)));
  }

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="company-supervision-title" aria-busy={pending}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="company-supervision-title" className="text-xl font-semibold">Compagnies et membres</h2>
          <p className="mt-1 text-sm text-muted">Retrouvez chaque compte dans sa compagnie et vérifiez son accès.</p>
        </div>
        <Button variant="secondary" type="button" disabled={pending} onClick={refresh}>
          <RefreshCw className={cn("mr-2 h-4 w-4", pending && "animate-spin motion-reduce:animate-none")} aria-hidden />
          {pending ? "Actualisation…" : "Actualiser"}
        </Button>
      </div>

      {snapshot.status === "error" ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{snapshot.message}</p>
      ) : <>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <p><strong className="font-semibold tabular-nums text-foreground">{companies.length}</strong> {companies.length === 1 ? "compagnie" : "compagnies"}</p>
          <p><strong className="font-semibold tabular-nums text-foreground">{memberTotal}</strong> {memberTotal === 1 ? "membre" : "membres"}</p>
          <p><strong className="font-semibold tabular-nums text-foreground">{openAccessTotal}</strong> {openAccessTotal === 1 ? "accès ouvert" : "accès ouverts"}</p>
          <p>Relevé le {formatTimestamp(snapshot.loadedAt)}</p>
        </div>
        {companies.length ? <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Rechercher une compagnie ou un membre</span>
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden />
              <Input className="pl-9 text-base sm:text-sm" placeholder="Compagnie, nom ou email" value={query} onChange={(event) => search(event.target.value)} />
            </label>
            <label className="sm:w-48">
              <span className="sr-only">Filtrer les accès</span>
              <select className="min-h-11 w-full rounded-md border border-border bg-panel px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm" value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)}>
                <option value="all">Tous les accès</option>
                <option value="open">Accès ouverts</option>
                <option value="closed">Accès fermés</option>
              </select>
            </label>
          </div>
          <p className="text-sm text-muted" role="status">{filtered.length} {filtered.length === 1 ? "compagnie affichée" : "compagnies affichées"}{query ? ` pour « ${query} »` : ""}</p>
          {filtered.length ? (
            <div className="overflow-hidden rounded-lg border border-border bg-panel">
              <div className="hidden grid-cols-[minmax(0,1fr)_6rem_12rem_12rem] gap-4 border-b border-border bg-panel-strong px-4 py-3 text-xs font-medium text-muted lg:grid" aria-hidden>
                <span>Compagnie</span><span>Membres</span><span>Accès et formule</span><span>Dernière activité observée</span>
              </div>
              {filtered.map((company) => <CompanyRow key={company.id} company={company} expanded={expanded.has(company.id)} toggle={() => toggle(company.id)} canViewAccess={snapshot.canViewAccess} canManageBilling={canManageBilling} query={query} />)}
            </div>
          ) : <div className="py-6 text-sm">
            <p>Aucune compagnie ne correspond à ces critères.</p>
            <Button className="mt-3" variant="secondary" onClick={() => { search(""); setAccessFilter("all"); }}>Effacer les filtres</Button>
          </div>}
          <p className="text-xs text-muted">{snapshot.canViewAccess ? "Les dates indiquent les connexions et pages consultées enregistrées. L’absence de date signifie qu’aucun événement conservé n’a été trouvé ; elle ne prouve pas l’absence d’utilisation." : "Le droit de consulter les connexions est nécessaire pour voir les dernières connexions et activités des membres."}</p>
        </> : <p className="py-6 text-sm text-muted">Aucun espace compagnie n’a encore été créé. Les demandes d’inscription restent suivies dans la bêta.</p>}
      </>}
    </section>
  );
}

function CompanyRow({ company, expanded, toggle, canViewAccess, canManageBilling, query }: { company: AdminSupervisedCompany; expanded: boolean; toggle: () => void; canViewAccess: boolean; canManageBilling: boolean; query: string }) {
  const lastObserved = canViewAccess ? company.members.reduce<string | null>((latest, member) => member.lastActivity && (!latest || member.lastActivity > latest) ? member.lastActivity : latest, null) : null;
  const detailId = `company-members-${company.id}`;
  return (
    <div className="border-b border-border last:border-b-0">
      <button type="button" className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 text-left transition-colors hover:bg-panel-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent lg:grid-cols-[minmax(0,1fr)_6rem_12rem_12rem] lg:gap-4" aria-expanded={expanded} aria-controls={detailId} onClick={toggle}>
        <span className="flex min-w-0 items-start gap-2">
          <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none", !expanded && "-rotate-90")} aria-hidden />
          <span className="min-w-0"><span className="block break-words font-semibold">{company.name}</span><span className="mt-1 block text-xs text-muted">{expanded ? "Masquer les membres" : "Voir les membres"}</span></span>
        </span>
        <span className="text-sm tabular-nums lg:pt-0.5">{company.memberCount} <span className="lg:sr-only">{company.memberCount === 1 ? "membre" : "membres"}</span></span>
        <span className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-1 lg:items-start">
          <Badge tone={company.hasAccess ? "success" : "warning"}>{company.hasAccess ? "Accès ouvert" : "Accès fermé"}</Badge>
          <span className="text-xs text-muted lg:w-full">{getSupervisionBillingLabel(company.billingStatus)}{company.billingStatus === "comped" ? ` · ${company.compedUntil ? `jusqu’au ${formatDate(company.compedUntil)}` : "sans échéance"}` : ""}</span>
        </span>
        <span className="col-span-2 text-xs text-muted lg:col-span-1 lg:pt-1"><span className="lg:sr-only">Dernière activité : </span>{canViewAccess ? formatTimestamp(lastObserved) : "Droit connexions requis"}</span>
      </button>
      <div id={detailId} hidden={!expanded}>
        {expanded ? <div className="border-t border-border bg-panel-strong/40 px-4">
          <h3 className="sr-only">Membres de {company.name}</h3>
          {company.members.length ? <ul className="divide-y divide-border">
            {company.members.map((member) => <li key={member.userId} className={cn("grid min-w-0 gap-2 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_9rem] lg:grid-cols-[minmax(0,1fr)_9rem_12rem_12rem]", memberMatchesSearch(member, query) && "bg-accent/5")}>
              <div className="min-w-0"><p className="break-words font-medium">{member.fullName || "Nom non renseigné"}</p><p className="mt-1 break-all text-xs text-muted">{member.email || "Email indisponible"}</p></div>
              <p className="text-xs text-muted">{getSupervisionRoleLabel(member.role)}</p>
              {canViewAccess ? <><p className="text-xs text-muted"><span className="block font-medium text-foreground">Dernière connexion</span><span className="mt-1 block">{formatTimestamp(member.lastLogin)}</span></p><p className="text-xs text-muted"><span className="block font-medium text-foreground">Dernière activité</span><span className="mt-1 block">{formatTimestamp(member.lastActivity)}</span></p></> : null}
            </li>)}
          </ul> : <p className="py-4 text-sm text-muted">Aucun membre rattaché à cette compagnie.</p>}
          {canManageBilling ? <div className="border-t border-border py-4"><CompanyBillingForm company={company} /></div> : null}
        </div> : null}
      </div>
    </div>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return "Aucune date conservée";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(date) : "Date indisponible";
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" }).format(date) : "Date indisponible";
}
