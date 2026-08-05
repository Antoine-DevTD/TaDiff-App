"use client";

import { AlertTriangle, ArrowRight, Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TreasuryBalanceForm } from "@/components/finance/treasury-balance-form";
import { TreasuryChart, type TreasuryProjectionPoint } from "@/components/finance/treasury-chart";
import { TreasuryMovementDialog } from "@/components/finance/treasury-movement-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency, getMonthlyFixedCostsTotal } from "@/lib/finance";
import type { FixedCost, GrantOpportunity, QuoteItem, Show, TreasuryMovement, TreasurySnapshot } from "@/types";

const DAY = 86_400_000;

export function TreasuryOverview({ fixedCosts, initialHistory, initialTreasury, isDemoTreasury, bankConnectionUrl, initialMovements, shows, today }: {
  fixedCosts: FixedCost[];
  grants: GrantOpportunity[];
  quotes: QuoteItem[];
  initialHistory: TreasurySnapshot[];
  initialTreasury: TreasurySnapshot | null;
  isDemoTreasury: boolean;
  bankConnectionUrl: string | null;
  initialMovements: TreasuryMovement[];
  shows: Show[];
  today: string;
}) {
  const [treasury, setTreasury] = useState(initialTreasury);
  const [history, setHistory] = useState(initialHistory);
  const [movements, setMovements] = useState(initialMovements);
  const currentCash = treasury?.balance ?? 0;
  const projection = useMemo(() => buildProjection(currentCash, movements, fixedCosts, today), [currentCash, fixedCosts, movements, today]);
  const upcoming = movements.filter((movement) => movement.status === "planned" && movement.movementDate >= today).slice(0, 8);
  const securedIncome = upcoming.filter((item) => item.direction === "income" && item.reliability === "secured").reduce((sum, item) => sum + item.amount, 0);
  const committedExpense = upcoming.filter((item) => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0);
  const lowest = projection.reduce((minimum, point) => Math.min(minimum, point.central), currentCash);
  const lowPoint = projection.find((point) => point.central === lowest);
  const uncertainIncome = upcoming.filter((item) => item.direction === "income" && item.reliability !== "secured").reduce((sum, item) => sum + item.amount, 0);

  function recordSnapshot(snapshot: TreasurySnapshot) {
    setTreasury(snapshot);
    setHistory((current) => [...current.filter((item) => item.id !== snapshot.id), snapshot]);
  }

  return (
    <section className="space-y-5" data-tour="finance-tresorerie">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Pilotage financier</p><h2 className="mt-1 text-2xl font-semibold">Projection de trésorerie</h2><p className="mt-1 max-w-2xl text-sm text-muted">Anticipez les entrées et sorties des 13 prochaines semaines, selon leur niveau de fiabilité.</p></div>
        <div className="flex flex-wrap gap-2"><TreasuryMovementDialog shows={shows} onCreated={(movement) => setMovements((current) => [...current, movement].sort((a, b) => a.movementDate.localeCompare(b.movementDate)))} />{bankConnectionUrl ? <ButtonLink href={bankConnectionUrl} variant="secondary"><Landmark className="mr-2 h-4 w-4" aria-hidden />Connecter la banque</ButtonLink> : <Button disabled variant="secondary" title="Configurez BANK_CONNECTION_URL dans Vercel pour activer ce bouton"><Landmark className="mr-2 h-4 w-4" aria-hidden />Connexion bancaire indisponible</Button>}</div>
      </header>

      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Solde actuel" value={formatCurrency(currentCash)} detail={isDemoTreasury ? "Donnée de démonstration" : treasury ? `Actualisé le ${formatDate(treasury.recordedOn)}` : "À renseigner"} />
        <Metric label="Point bas projeté" value={formatCurrency(lowest)} detail={lowPoint ? `Semaine du ${lowPoint.label}` : "Aucune projection"} tone={lowest < 0 ? "danger" : "default"} />
        <Metric label="Entrées sécurisées" value={formatCurrency(securedIncome)} detail="Mouvements confirmés à venir" tone="success" />
        <Metric label="Sorties engagées" value={formatCurrency(committedExpense)} detail={`${formatCurrency(getMonthlyFixedCostsTotal(fixedCosts))} de frais fixes / mois`} />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-5">
          <Card className="overflow-hidden p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><p className="font-semibold">Prévision à 13 semaines</p><p className="mt-1 text-xs text-muted">La zone représente l’écart entre le scénario prudent et l’optimiste.</p></div><Badge tone={lowest < 0 ? "danger" : lowest < getMonthlyFixedCostsTotal(fixedCosts) ? "warning" : "success"}>{lowest < 0 ? "Risque de découvert" : "Solde positif"}</Badge></div><div className="p-3 sm:p-5"><TreasuryChart points={projection} /></div></Card>
          <Card className="overflow-hidden p-0"><div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><p className="font-semibold">Prochains mouvements</p><p className="mt-1 text-xs text-muted">Les montants confirmés, probables et encore à sécuriser.</p></div><span className="text-xs text-muted">{upcoming.length} affiché{upcoming.length > 1 ? "s" : ""}</span></div>{upcoming.length ? <div className="overflow-x-auto"><table className="w-full min-w-[42rem] text-sm"><thead className="bg-panel-strong/60 text-left text-xs text-muted"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Mouvement</th><th className="px-3 py-3 font-medium">Fiabilité</th><th className="px-5 py-3 text-right font-medium">Montant</th></tr></thead><tbody className="divide-y divide-border">{upcoming.map((movement) => <tr key={movement.id}><td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(movement.movementDate)}</td><td className="px-3 py-3"><span className="font-medium">{movement.label}</span>{movement.showTitle ? <span className="mt-0.5 block text-xs text-muted">{movement.showTitle}</span> : null}</td><td className="px-3 py-3"><Reliability value={movement.reliability} /></td><td className={`whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums ${movement.direction === "income" ? "text-success" : "text-foreground"}`}>{movement.direction === "income" ? "+" : "−"}{formatCurrency(movement.amount)}</td></tr>)}</tbody></table></div> : <p className="p-6 text-center text-sm text-muted">Aucun mouvement à venir. Ajoutez un encaissement ou une dépense pour fiabiliser la projection.</p>}</Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5"><div className="flex items-center gap-2"><AlertTriangle className={`h-4 w-4 ${lowest < 0 ? "text-danger" : "text-warning"}`} aria-hidden /><p className="font-semibold">Points d’attention</p></div><div className="mt-4 space-y-3 text-sm">{lowest < 0 ? <Risk title="Découvert projeté" detail={`${formatCurrency(Math.abs(lowest))} à couvrir avant la semaine du ${lowPoint?.label}.`} /> : <Risk title="Marge disponible" detail={`Le point bas reste à ${formatCurrency(lowest)}.`} />}{uncertainIncome > 0 ? <Risk title="Recettes à confirmer" detail={`${formatCurrency(uncertainIncome)} dépendent encore d'une confirmation.`} /> : null}{fixedCosts.length === 0 ? <Risk title="Frais fixes absents" detail="Ajoutez les dépenses régulières pour ne pas surestimer la trésorerie." /> : null}</div></Card>
          <Card className="p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" aria-hidden /><p className="font-semibold">Actions recommandées</p></div><nav className="mt-3 divide-y divide-border" aria-label="Actions de trésorerie"><Action href="/pipeline" label="Sécuriser les dates probables" /><Action href="/billing" label="Vérifier les acomptes et soldes" /><Action href="/subventions" label="Suivre les subventions ouvertes" /></nav></Card>
          <details className="rounded-xl border border-border bg-panel"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Actualiser le solde bancaire</summary><div className="border-t border-border p-5"><TreasuryBalanceForm currentBalance={treasury?.balance ?? null} onRecorded={recordSnapshot} /><p className="mt-3 text-xs text-muted">{history.length} relevé{history.length > 1 ? "s" : ""} enregistré{history.length > 1 ? "s" : ""}.</p></div></details>
        </aside>
      </div>
    </section>
  );
}

function buildProjection(balance: number, movements: TreasuryMovement[], costs: FixedCost[], startDate: string): TreasuryProjectionPoint[] {
  const today = new Date(`${startDate}T00:00:00`);
  const points: TreasuryProjectionPoint[] = [];
  let central = balance, prudent = balance, optimistic = balance;
  for (let week = 0; week < 13; week += 1) {
    const from = new Date(today.getTime() + week * 7 * DAY);
    const to = new Date(from.getTime() + 7 * DAY);
    const weekMovements = movements.filter((item) => item.status === "planned" && new Date(item.movementDate) >= from && new Date(item.movementDate) < to);
    const recurring = costs.filter((cost) => { const due = new Date(cost.nextDueDate); if (due >= from && due < to) return true; const months = cost.frequency === "Mensuel" ? 1 : cost.frequency === "Trimestriel" ? 3 : 12; const copy = new Date(due); while (copy < from) copy.setMonth(copy.getMonth() + months); return copy >= from && copy < to; });
    const income = weekMovements.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = weekMovements.filter((item) => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0) + recurring.reduce((sum, item) => sum + item.amount, 0);
    const weightedIncome = weekMovements.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount * (item.reliability === "secured" ? 1 : item.reliability === "probable" ? 0.65 : 0.25), 0);
    const secured = weekMovements.filter((item) => item.direction === "income" && item.reliability === "secured").reduce((sum, item) => sum + item.amount, 0);
    central += weightedIncome - expense; prudent += secured - expense; optimistic += income - expense;
    points.push({ label: from.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), central, prudent, optimistic, income, expense });
  }
  return points;
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "success" | "danger" }) { return <div className="bg-panel p-5"><p className="text-xs font-medium text-muted">{label}</p><p className={`mt-2 text-2xl font-semibold tabular-nums ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : ""}`}>{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>; }
function Reliability({ value }: { value: TreasuryMovement["reliability"] }) { const meta = value === "secured" ? ["Confirmé", "success"] : value === "probable" ? ["Probable", "warning"] : ["À sécuriser", "neutral"]; return <Badge tone={meta[1] as "success" | "warning" | "neutral"}>{meta[0]}</Badge>; }
function Risk({ title, detail }: { title: string; detail: string }) { return <div className="border-l-2 border-warning/60 pl-3"><p className="font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p></div>; }
function Action({ href, label }: { href: string; label: string }) { return <Link className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm font-medium transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" href={href}>{label}<ArrowRight className="h-4 w-4" aria-hidden /></Link>; }
function formatDate(value: string) { return new Date(value).toLocaleDateString("fr-FR"); }
