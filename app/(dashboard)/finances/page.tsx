import Link from "next/link";
import { FixedCostCreateDialog } from "@/components/finance/fixed-cost-create-dialog";
import { FixedCostRowActions } from "@/components/finance/fixed-cost-row-actions";
import { TreasuryOverview } from "@/components/finance/treasury-overview";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  buildDealProfitability,
  formatCurrency,
  getFixedCostSharePerPerformance,
  getMonthlyFixedCostEquivalent,
  getMonthlyFixedCostsTotal,
  getVerdictMeta,
} from "@/lib/finance";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getFixedCosts,
  getGrantOpportunities,
  getLatestTreasurySnapshot,
  getPipelineDeals,
  getQuoteItems,
  getReminders,
  getShows,
  getTreasurySnapshots,
} from "@/lib/supabase/queries";
import type { FixedCost, PipelineDeal, Reminder } from "@/types";

const targetPerformancesPerYear = 24;

function getWeightedValue(deal: PipelineDeal) {
  return Math.round((deal.value * deal.probability) / 100);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildCashFocus(deals: PipelineDeal[], reminders: Reminder[]) {
  const today = startOfDay(new Date());

  return deals
    .filter((deal) => deal.stage !== "Perdu")
    .map((deal) => {
      const relatedReminders = reminders.filter(
        (reminder) => reminder.relatedTo === deal.title || reminder.relatedTo === deal.showTitle,
      );
      const nextReminder = relatedReminders[0];
      const dueDate = nextReminder?.dueDate || deal.nextFollowUpAt || "";
      const dueTime = dueDate ? startOfDay(new Date(dueDate)).getTime() : Number.MAX_SAFE_INTEGER;
      const overdue = dueDate ? startOfDay(new Date(dueDate)) < today : false;

      return {
        deal,
        dueDate,
        dueTime,
        overdue,
        weighted: getWeightedValue(deal),
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.dueTime !== b.dueTime) return a.dueTime - b.dueTime;
      return b.weighted - a.weighted;
    })
    .slice(0, 5);
}

function getFinanceTone(stage: PipelineDeal["stage"]) {
  if (stage === "Confirme") return "success" as const;
  if (stage === "Negociation") return "warning" as const;
  return "neutral" as const;
}

function getFixedCostTone(cost: FixedCost) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(cost.nextDueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "danger" as const;
  if (diffDays <= 14) return "warning" as const;
  return "neutral" as const;
}

export default async function FinancesPage() {
  const [deals, reminders, shows, quotes, fixedCosts, grants, treasury, treasuryHistory] =
    await Promise.all([
      getPipelineDeals(),
      getReminders(),
      getShows(),
      getQuoteItems(),
      getFixedCosts(),
      getGrantOpportunities(),
      getLatestTreasurySnapshot(),
      getTreasurySnapshots(),
    ]);
  const isDemoTreasury = !hasSupabaseEnv();

  const signedDeals = deals.filter((deal) => deal.stage === "Confirme");
  const activeDeals = deals.filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu");
  const signedRevenue = signedDeals.reduce((total, deal) => total + deal.value, 0);
  const weightedRevenue = activeDeals.reduce((total, deal) => total + getWeightedValue(deal), 0);
  const diffusionRaw = activeDeals.reduce((total, deal) => total + deal.value, 0);
  const quoteBalance = quotes.reduce((total, quote) => total + quote.depositDue + quote.balanceDue, 0);
  const monthlyFixedCosts = getMonthlyFixedCostsTotal(fixedCosts);
  const fixedCostShare = getFixedCostSharePerPerformance({
    costs: fixedCosts,
    targetPerformancesPerYear,
  });
  const showMap = new Map(shows.map((show) => [show.id, show]));
  const profitabilityRows = deals
    .filter((deal) => deal.stage !== "Perdu")
    .map((deal) => {
      const result = buildDealProfitability({ deal, show: showMap.get(deal.showId) });

      return {
        deal,
        recommendedPrice: Math.max(deal.value, result.breakEven + fixedCostShare),
        result,
      };
    })
    .sort((a, b) => a.result.margin - b.result.margin)
    .slice(0, 5);
  const cashFocus = buildCashFocus(deals, reminders);
  const focusDeal = cashFocus[0]?.deal ?? signedDeals[0] ?? activeDeals[0] ?? null;
  const nextFixedCosts = [...fixedCosts]
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {deals.length === 0 && shows.length === 0 ? (
        <EmptyState
          title="Aucune base financiere"
          description="Ajoutez un spectacle et des dates possibles pour commencer a suivre budgets et revenus."
          actionHref="/shows?create=1"
          actionLabel="Ajouter un spectacle"
        />
      ) : (
        <>
          <TreasuryOverview
            fixedCosts={fixedCosts}
            grants={grants}
            initialHistory={treasuryHistory}
            initialTreasury={treasury}
            isDemoTreasury={isDemoTreasury}
            quotes={quotes}
          />

          <section className="grid gap-3 md:grid-cols-3">
            <AdviceBlock
              title={`${formatCurrency(fixedCostShare)} a lisser par date`}
              detail={`Base : ${targetPerformancesPerYear} dates/an pour couvrir ${formatCurrency(monthlyFixedCosts)} de frais fixes mensuels.`}
            />
            <AdviceBlock
              title={`${formatCurrency(weightedRevenue)} de dates ponderees`}
              detail="Pas encore du cash. Les actions transforment cette probabilite en encaissement."
            />
            <AdviceBlock
              title={`${formatCurrency(quoteBalance)} reste a encaisser`}
              detail="Les devis actifs alimentent la projection, a suivre jusqu au solde."
            />
          </section>

          <details className="group border border-border bg-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <span>
                <span className="block font-semibold">Frais fixes et reperes annuels</span>
                <span className="mt-1 block text-sm font-normal text-muted">Assurance, banque, outils et montant a integrer dans chaque date.</span>
              </span>
              <span className="text-sm font-medium text-accent group-open:hidden">Afficher</span>
              <span className="hidden text-sm font-medium text-accent group-open:inline">Masquer</span>
            </summary>
            <div className="space-y-6 border-t border-border p-5">
              <section className="grid gap-4 md:grid-cols-4">
                <MetricCard label="CA signe" value={formatCurrency(signedRevenue)} detail="Dates confirmees" />
                <MetricCard label="CA previsionnel" value={formatCurrency(weightedRevenue)} detail="Dates ponderees" />
                <MetricCard label="Dates ouvertes" value={formatCurrency(diffusionRaw)} detail="Valeur ouverte totale" />
                <MetricCard label="Frais fixes annuels" value={formatCurrency(monthlyFixedCosts * 12)} detail="Equivalent annuel" />
              </section>

          <Card className="space-y-4 p-5 shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Frais fixes</p>
                <p className="mt-1 text-sm text-muted">
                  Assurance, banque, comptable, stockage et outils a lisser dans les prix.
                </p>
              </div>
              <FixedCostCreateDialog />
            </div>
            {nextFixedCosts.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
                Aucun frais fixe. Ajoutez-en un pour fiabiliser la projection.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {nextFixedCosts.map((cost) => (
                  <div key={cost.id} className="rounded-lg border border-border bg-panel-strong/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{cost.label}</p>
                        <p className="mt-1 text-sm text-muted">
                          {cost.category} - {cost.frequency}
                        </p>
                      </div>
                      <Badge tone={getFixedCostTone(cost)}>
                        {new Date(cost.nextDueDate).toLocaleDateString("fr-FR")}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <FinanceCell label="Montant" value={formatCurrency(cost.amount)} />
                      <FinanceCell
                        label="Equivalent mensuel"
                        value={formatCurrency(getMonthlyFixedCostEquivalent(cost))}
                      />
                    </div>
                    {cost.notes ? <p className="mt-3 text-sm text-muted">{cost.notes}</p> : null}
                    <FixedCostRowActions cost={cost} />
                  </div>
                ))}
              </div>
            )}
          </Card>
            </div>
          </details>

          <details className="group border border-border bg-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <span>
                <span className="block font-semibold">Prix, devis et encaissements</span>
                <span className="mt-1 block text-sm font-normal text-muted">Vérifier le prix minimum d&apos;une date et les montants restant a encaisser.</span>
              </span>
              <span className="text-sm font-medium text-accent group-open:hidden">Afficher</span>
              <span className="hidden text-sm font-medium text-accent group-open:inline">Masquer</span>
            </summary>
          <section className="grid gap-6 border-t border-border p-5 xl:grid-cols-[1fr_1fr]">
            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Prix minimum par date</p>
                <p className="mt-1 text-sm text-muted">
                  Les frais fixes sont ajoutes au point mort pour éviter de vendre a perte.
                </p>
              </div>
              <div className="space-y-3">
                {profitabilityRows.map(({ deal, recommendedPrice, result }) => {
                  const verdict = getVerdictMeta(result.verdict);

                  return (
                    <Link
                      key={deal.id}
                      className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                      href={deal.showId ? `/shows/${deal.showId}` : "/pipeline"}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <p className="mt-1 text-sm text-muted">{deal.showTitle}</p>
                        </div>
                        <Badge tone={verdict.tone}>{verdict.label}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                        <FinanceCell label="Prix" value={formatCurrency(deal.value)} />
                        <FinanceCell label="Point mort" value={formatCurrency(result.breakEven)} />
                        <FinanceCell label="Frais fixes" value={formatCurrency(fixedCostShare)} />
                        <FinanceCell label="A viser" value={formatCurrency(recommendedPrice)} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Devis et encaissements</p>
                <p className="mt-1 text-sm text-muted">
                  Les acomptes et soldes viennent du module facturation.
                </p>
              </div>
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                    href={`/billing/${quote.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{quote.number}</p>
                        <p className="mt-1 text-sm text-muted">{quote.organization}</p>
                      </div>
                      <Badge>{quote.status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                      <FinanceCell label="Montant" value={formatCurrency(quote.amount)} />
                      <FinanceCell label="Acompte" value={formatCurrency(quote.depositDue)} />
                      <FinanceCell label="Solde" value={formatCurrency(quote.balanceDue)} />
                      <FinanceCell label="Frais fixes" value={formatCurrency(fixedCostShare)} />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </section>
          </details>

          <details className="group border border-border bg-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <span>
                <span className="block font-semibold">Priorités d&apos;encaissement</span>
                <span className="mt-1 block text-sm font-normal text-muted">Les dates et dossiers qui demandent une action financiere.</span>
              </span>
              <span className="text-sm font-medium text-accent group-open:hidden">Afficher</span>
              <span className="hidden text-sm font-medium text-accent group-open:inline">Masquer</span>
            </summary>
          <section className="grid gap-6 border-t border-border p-5 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Focus encaissement</p>
                  <p className="mt-2 text-xl font-semibold">
                    {focusDeal?.title || "Aucun dossier financier prioritaire"}
                  </p>
                </div>
                {focusDeal ? <Badge tone={getFinanceTone(focusDeal.stage)}>{focusDeal.stage}</Badge> : null}
              </div>
              <p className="text-sm text-muted">
                {focusDeal
                  ? `${focusDeal.contactName} - ${focusDeal.showTitle} - ${focusDeal.nextAction || "Action a definir"}`
                  : "Les prochains lots permettront de suivre acomptes, soldes et échéances reelles."}
              </p>
              {focusDeal ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <InfoCard label="Montant" value={formatCurrency(focusDeal.value)} />
                  <InfoCard label="Pondere" value={formatCurrency(getWeightedValue(focusDeal))} />
                  <InfoCard label="Probabilite" value={`${focusDeal.probability}%`} />
                  <InfoCard
                    label="Action"
                    value={
                      focusDeal.nextFollowUpAt
                        ? new Date(focusDeal.nextFollowUpAt).toLocaleDateString("fr-FR")
                        : "À planifier"
                    }
                  />
                </div>
              ) : null}
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Priorités cash</p>
                <p className="mt-1 text-sm text-muted">
                  Les dossiers qui meritent une attention financiere immédiate.
                </p>
              </div>
              {cashFocus.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
                  Aucune priorite financiere a afficher.
                </div>
              ) : (
                <div className="space-y-3">
                  {cashFocus.map(({ deal, dueDate, overdue, weighted }) => (
                    <Link
                      key={deal.id}
                      className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                      href="/pipeline"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{deal.title}</p>
                          <p className="mt-1 truncate text-sm text-muted">
                            {deal.contactName} - {deal.showTitle}
                          </p>
                        </div>
                        <Badge tone={overdue ? "danger" : getFinanceTone(deal.stage)}>{deal.stage}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <FinanceCell label="Brut" value={formatCurrency(deal.value)} />
                        <FinanceCell label="Pondere" value={formatCurrency(weighted)} />
                        <FinanceCell
                          label="Action"
                          value={dueDate ? new Date(dueDate).toLocaleDateString("fr-FR") : "À planifier"}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>
          </details>
        </>
      )}
    </div>
  );
}

function AdviceBlock({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </Card>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function FinanceCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
