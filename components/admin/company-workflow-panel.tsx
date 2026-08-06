"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ContactRound,
  FileStack,
  Landmark,
  Mail,
  Search,
  Sparkles,
  Theater,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminCompanyWorkflowMetrics } from "@/lib/supabase/admin";

const workflowMilestones = [
  { key: "profile", label: "Profil compagnie renseigné" },
  { key: "show", label: "Premier spectacle créé" },
  { key: "contact", label: "Premiers contacts ajoutés" },
  { key: "diffusion", label: "Diffusion commencée" },
  { key: "document", label: "Premier document classé" },
  { key: "action", label: "Première action terminée" },
  { key: "calendar", label: "Premier événement ajouté à l’agenda" },
  { key: "treasury", label: "Trésorerie commencée" },
] as const;

export function CompanyWorkflowPanel({ companies }: { companies: AdminCompanyWorkflowMetrics[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(companies[0]?.companyId ?? "");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr-FR");
    if (!normalized) return companies;
    return companies.filter((company) => company.companyName.toLocaleLowerCase("fr-FR").includes(normalized));
  }, [companies, query]);
  const selected = filtered.find((company) => company.companyId === selectedId) ?? filtered[0] ?? null;

  if (companies.length === 0) {
    return <Card className="border-dashed p-6 text-sm text-muted">Aucune compagnie à analyser pour le moment.</Card>;
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,2fr)]">
      <Card className="min-w-0 overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <label className="relative block">
            <span className="sr-only">Rechercher une compagnie</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden />
            <Input className="pl-9" placeholder="Rechercher une compagnie" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="max-h-[34rem] overflow-y-auto p-2" aria-label="Choisir une compagnie" role="group">
          {filtered.length ? filtered.map((company) => {
            const score = getMilestones(company).filter((item) => item.done).length;
            const active = company.companyId === selected?.companyId;
            return (
              <button
                key={company.companyId}
                type="button"
                aria-controls="company-workflow-detail"
                aria-pressed={active}
                className={cn(
                  "w-full rounded-md px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active ? "bg-accent text-white" : "hover:bg-panel-strong",
                )}
                onClick={() => setSelectedId(company.companyId)}
              >
                <span className="block truncate text-sm font-semibold">{company.companyName}</span>
                <span className={cn("mt-1 block text-xs", active ? "text-white/75" : "text-muted")}>
                  {score}/{workflowMilestones.length} repères · {formatLastActivity(company.lastActivity)}
                </span>
              </button>
            );
          }) : <p className="p-4 text-sm text-muted">Aucune compagnie ne correspond à cette recherche.</p>}
        </div>
      </Card>

      {selected ? <CompanyWorkflowDetail company={selected} /> : null}
    </div>
  );
}

function CompanyWorkflowDetail({ company }: { company: AdminCompanyWorkflowMetrics }) {
  const milestones = getMilestones(company);
  const completed = milestones.filter((item) => item.done).length;
  return (
    <div id="company-workflow-detail" className="min-w-0 space-y-5" role="region" aria-label={`Parcours de ${company.companyName}`} aria-live="polite">
      <section className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold">{company.companyName}</h2>
            <p className="mt-1 text-sm text-muted">Créée le {formatDate(company.createdAt)} · dernière activité {formatLastActivity(company.lastActivity)} · dernière connexion {formatLastActivity(company.lastLogin)}</p>
          </div>
          <div className="flex flex-wrap gap-2"><Badge>{company.planCode || "Sans formule"}</Badge><Badge tone={company.billingStatus === "active" || company.billingStatus === "comped" ? "success" : "neutral"}>{getBillingLabel(company.billingStatus)}</Badge></div>
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div><p className="text-sm font-medium">Parcours observé</p><p className="mt-1 text-xs text-muted">{completed} repères atteints sur {workflowMilestones.length}, calculés uniquement à partir de compteurs.</p></div>
          <p className="text-2xl font-semibold tabular-nums">{Math.round((completed / workflowMilestones.length) * 100)} %</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-strong" aria-label={`${completed} repères atteints sur ${workflowMilestones.length}`} role="progressbar" aria-valuemin={0} aria-valuemax={workflowMilestones.length} aria-valuenow={completed}><div className="h-full bg-accent" style={{ width: `${(completed / workflowMilestones.length) * 100}%` }} /></div>
      </section>

      <section>
        <h3 className="text-base font-semibold">Ce qui est déjà en place</h3>
        <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {milestones.map((item) => <div key={item.key} className="flex min-h-10 items-center gap-3 border-b border-border/70 py-2 text-sm">{item.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden /> : <Circle className="h-4 w-4 shrink-0 text-muted/50" aria-hidden />}<span className={item.done ? "font-medium" : "text-muted"}>{item.label}</span></div>)}
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold">Volumes par espace</h3>
        <p className="mt-1 text-sm text-muted">Les nombres indiquent qu’un espace est utilisé, sans révéler ce qu’il contient.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <UsageMetric icon={Theater} label="Spectacles" value={company.showCount} detail={`${company.budgetSetupCount} budget(s) configuré(s)`} />
          <UsageMetric icon={ContactRound} label="Contacts" value={company.contactCount} detail={`${company.venueCount} lieu(x)`} />
          <UsageMetric icon={CalendarDays} label="Diffusion" value={company.opportunityCount} detail={`${company.exploitationCount} exploitation(s) · ${company.performanceCount} représentation(s)`} />
          <UsageMetric icon={FileStack} label="Documents" value={company.documentCount} detail={`${company.grantCount} dossier(s) de subvention engagé(s)`} />
          <UsageMetric icon={Landmark} label="Trésorerie" value={company.treasuryMovementCount} detail={`${company.fixedCostCount} frais fixe(s)`} />
          <UsageMetric icon={Sparkles} label="William" value={company.williamRequestCount} detail="Nombre de demandes, sans leur contenu" />
          <UsageMetric icon={CheckCircle2} label="Actions" value={company.completedReminderCount} detail={`${company.reminderCount} action(s) créée(s)`} />
          <UsageMetric icon={Mail} label="Emails" value={company.emailTemplateCount} detail="Modèles enregistrés dans l’espace" />
          <UsageMetric icon={Users} label="Équipe" value={company.memberCount} detail={`${company.profileFieldCount}/8 champs du profil renseignés`} />
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActivityValue label="Activités sur 7 jours" value={company.activity7dCount} />
          <ActivityValue label="Activités sur 30 jours" value={company.activity30dCount} />
          <ActivityValue label="Jours actifs sur 30 jours" value={company.activeDays30d} />
          <ActivityValue label="Pages vues sur 30 jours" value={company.pageView30dCount} />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">Espaces consultés récemment</p>
          <div className="mt-2 flex flex-wrap gap-2">{company.visitedSections.length ? company.visitedSections.map((section) => <Badge key={section}>{section}</Badge>) : <span className="text-sm text-muted">Aucun espace journalisé sur les 30 derniers jours.</span>}</div>
        </div>
      </section>
    </div>
  );
}

function UsageMetric({ detail, icon: Icon, label, value }: { detail: string; icon: typeof Theater; label: string; value: number }) {
  return <div className="flex min-w-0 items-start gap-3 rounded-md bg-panel-strong/55 p-4"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden /><div className="min-w-0"><div className="flex items-baseline gap-2"><p className="text-xl font-semibold tabular-nums">{value}</p><p className="truncate text-sm font-semibold">{label}</p></div><p className="mt-1 text-xs leading-5 text-muted">{detail}</p></div></div>;
}

function ActivityValue({ label, value }: { label: string; value: number }) {
  return <div className="border-l border-border pl-4"><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>;
}

function getMilestones(company: AdminCompanyWorkflowMetrics) {
  const done = {
    profile: company.profileFieldCount >= 3,
    show: company.showCount > 0,
    contact: company.contactCount > 0,
    diffusion: company.opportunityCount > 0 || company.exploitationCount > 0,
    document: company.documentCount > 0,
    action: company.completedReminderCount > 0,
    calendar: company.calendarEventCount > 0,
    treasury: company.fixedCostCount > 0 || company.treasuryMovementCount > 0,
  };
  return workflowMilestones.map((item) => ({ ...item, done: done[item.key] }));
}

function getBillingLabel(status: AdminCompanyWorkflowMetrics["billingStatus"]) {
  return { trial: "Essai", active: "Actif", comped: "Offert", past_due: "Paiement en retard", cancelled: "Résilié" }[status];
}

function formatDate(value: string) { return new Date(value).toLocaleDateString("fr-FR"); }
function formatLastActivity(value: string | null) { return value ? `le ${formatDate(value)}` : "non journalisée"; }
