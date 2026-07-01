import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getPipelineDeals,
  getQuoteItems,
  getReminders,
  getShows,
} from "@/lib/supabase/queries";
import { buildDealProfitability, formatCurrency, getVerdictMeta } from "@/lib/finance";
import type { PipelineDeal, Reminder } from "@/types";

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

export default async function FinancesPage() {
  const [deals, reminders, shows, quotes] = await Promise.all([
    getPipelineDeals(),
    getReminders(),
    getShows(),
    getQuoteItems(),
  ]);

  const signedDeals = deals.filter((deal) => deal.stage === "Confirme");
  const activeDeals = deals.filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu");
  const signedRevenue = signedDeals.reduce((total, deal) => total + deal.value, 0);
  const weightedRevenue = activeDeals.reduce((total, deal) => total + getWeightedValue(deal), 0);
  const pipelineRaw = activeDeals.reduce((total, deal) => total + deal.value, 0);
  const totalBudgets = shows.reduce((total, show) => total + show.budget, 0);
  const quoteBalance = quotes.reduce((total, quote) => total + quote.depositDue + quote.balanceDue, 0);
  const showMap = new Map(shows.map((show) => [show.id, show]));
  const profitabilityRows = deals
    .filter((deal) => deal.stage !== "Perdu")
    .map((deal) => ({
      deal,
      result: buildDealProfitability({ deal, show: showMap.get(deal.showId) }),
    }))
    .sort((a, b) => a.result.margin - b.result.margin)
    .slice(0, 5);

  const cashFocus = buildCashFocus(deals, reminders);
  const focusDeal = cashFocus[0]?.deal ?? signedDeals[0] ?? activeDeals[0] ?? null;

  const showFinanceRows = shows
    .map((show) => {
      const relatedDeals = deals.filter((deal) => deal.showId === show.id);
      const weighted = relatedDeals.reduce((total, deal) => total + getWeightedValue(deal), 0);
      const signed = relatedDeals
        .filter((deal) => deal.stage === "Confirme")
        .reduce((total, deal) => total + deal.value, 0);

      return {
        show,
        weighted,
        signed,
      };
    })
    .sort((a, b) => b.weighted - a.weighted || b.show.budget - a.show.budget)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Finances</h2>
        <p className="mt-1 text-sm text-muted">
          Vue de pilotage simple entre budget spectacle, CA signe et previsionnel pipeline.
        </p>
      </div>

      {deals.length === 0 && shows.length === 0 ? (
        <EmptyState
          title="Aucune base financiere"
          description="Ajoutez un spectacle et des opportunites pour commencer a suivre budgets et revenus."
          actionHref="/shows/new"
          actionLabel="Ajouter un spectacle"
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="CA signe"
              value={`${signedRevenue.toLocaleString("fr-FR")} EUR`}
              detail="Opportunites confirmees"
            />
            <MetricCard
              label="CA previsionnel"
              value={`${weightedRevenue.toLocaleString("fr-FR")} EUR`}
              detail="Pipeline pondere"
            />
            <MetricCard
              label="Pipeline brut"
              value={`${pipelineRaw.toLocaleString("fr-FR")} EUR`}
              detail="Valeur ouverte totale"
            />
            <MetricCard
              label="Budgets spectacle"
              value={`${totalBudgets.toLocaleString("fr-FR")} EUR`}
              detail={`Devis ${formatCurrency(quoteBalance)}`}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Rentabilite des dates</p>
                <p className="mt-1 text-sm text-muted">
                  Les opportunites sont classees avec la structure de couts du spectacle.
                </p>
              </div>
              <div className="space-y-3">
                {profitabilityRows.map(({ deal, result }) => {
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
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <FinanceCell label="Marge" value={formatCurrency(result.margin)} />
                        <FinanceCell label="Point mort" value={formatCurrency(result.breakEven)} />
                        <FinanceCell label="Prix" value={formatCurrency(deal.value)} />
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
                    href="/billing"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{quote.number}</p>
                        <p className="mt-1 text-sm text-muted">{quote.organization}</p>
                      </div>
                      <Badge>{quote.status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <FinanceCell label="Montant" value={formatCurrency(quote.amount)} />
                      <FinanceCell label="Acompte" value={formatCurrency(quote.depositDue)} />
                      <FinanceCell label="Solde" value={formatCurrency(quote.balanceDue)} />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Focus encaissement</p>
                  <p className="mt-2 text-xl font-semibold">
                    {focusDeal?.title || "Aucun dossier financier prioritaire"}
                  </p>
                </div>
                {focusDeal ? (
                  <Badge tone={getFinanceTone(focusDeal.stage)}>{focusDeal.stage}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted">
                {focusDeal
                  ? `${focusDeal.contactName} · ${focusDeal.showTitle} · ${focusDeal.nextAction || "Action a definir"}`
                  : "Les prochains lots permettront de suivre acomptes, soldes et echeances reelles."}
              </p>
              {focusDeal ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <InfoCard label="Montant" value={`${focusDeal.value.toLocaleString("fr-FR")} EUR`} />
                  <InfoCard label="Pondere" value={`${getWeightedValue(focusDeal).toLocaleString("fr-FR")} EUR`} />
                  <InfoCard label="Probabilite" value={`${focusDeal.probability}%`} />
                  <InfoCard
                    label="Relance"
                    value={
                      focusDeal.nextFollowUpAt
                        ? new Date(focusDeal.nextFollowUpAt).toLocaleDateString("fr-FR")
                        : "A planifier"
                    }
                  />
                </div>
              ) : null}
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Acces rapides</p>
                <p className="mt-1 text-sm text-muted">
                  Le financier se pilote depuis le pipeline, les contrats et les spectacles.
                </p>
              </div>
              <div className="grid gap-3">
                <QuickLink
                  href="/pipeline"
                  title="Ouvrir le pipeline"
                  detail="Verifier les montants, probabilites et prochaines actions."
                />
                <QuickLink
                  href="/contracts"
                  title="Ouvrir les contrats"
                  detail="Suivre ce qui est deja verrouille ou en validation."
                />
                <QuickLink
                  href="/shows"
                  title="Ouvrir les spectacles"
                  detail="Comparer budgets de production et potentiel commercial."
                />
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">Priorites cash</p>
                  <p className="mt-1 text-sm text-muted">Les dossiers qui meritent une attention financiere immediate.</p>
                </div>
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
                            {deal.contactName} · {deal.showTitle}
                          </p>
                        </div>
                        <Badge tone={overdue ? "danger" : getFinanceTone(deal.stage)}>{deal.stage}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <FinanceCell label="Brut" value={`${deal.value.toLocaleString("fr-FR")} EUR`} />
                        <FinanceCell label="Pondere" value={`${weighted.toLocaleString("fr-FR")} EUR`} />
                        <FinanceCell
                          label="Relance"
                          value={dueDate ? new Date(dueDate).toLocaleDateString("fr-FR") : "A planifier"}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">Par spectacle</p>
                  <p className="mt-1 text-sm text-muted">Lecture simple budget vs potentiel commercial.</p>
                </div>
              </div>
              {showFinanceRows.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
                  Aucun spectacle finance pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {showFinanceRows.map(({ show, signed, weighted }) => (
                    <Link
                      key={show.id}
                      className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                      href={`/shows/${show.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{show.title}</p>
                          <p className="mt-1 truncate text-sm text-muted">{show.discipline}</p>
                        </div>
                        <Badge tone={show.status === "En diffusion" ? "success" : "neutral"}>
                          {show.status}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <FinanceCell label="Budget" value={`${show.budget.toLocaleString("fr-FR")} EUR`} />
                        <FinanceCell label="Signe" value={`${signed.toLocaleString("fr-FR")} EUR`} />
                        <FinanceCell label="Pondere" value={`${weighted.toLocaleString("fr-FR")} EUR`} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <FinanceStageColumn
              title="Signes"
              description="Revenus deja verrouilles."
              items={signedDeals}
            />
            <FinanceStageColumn
              title="Negociation"
              description="Deals avec marge de manoeuvre financiere."
              items={deals.filter((deal) => deal.stage === "Negociation")}
            />
            <FinanceStageColumn
              title="Relance prevue"
              description="Opportunites a faire avancer pour ne pas perdre le CA probable."
              items={deals.filter((deal) => deal.stage === "Relance prevue")}
            />
          </section>
        </>
      )}
    </div>
  );
}

function FinanceStageColumn({
  description,
  items,
  title,
}: {
  description: string;
  items: PipelineDeal[];
  title: string;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold">{title}</p>
          <Badge tone="neutral">{items.length}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
          Aucun dossier dans cette etape.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((deal) => (
            <Link
              key={deal.id}
              className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
              href="/pipeline"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{deal.title}</p>
                  <p className="mt-1 truncate text-sm text-muted">
                    {deal.contactName} · {deal.showTitle}
                  </p>
                </div>
                <Badge tone={getFinanceTone(deal.stage)}>{deal.stage}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <FinanceCell label="Montant" value={`${deal.value.toLocaleString("fr-FR")} EUR`} />
                <FinanceCell label="Pondere" value={`${getWeightedValue(deal).toLocaleString("fr-FR")} EUR`} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
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

function QuickLink({
  detail,
  href,
  title,
}: {
  detail: string;
  href: string;
  title: string;
}) {
  return (
    <Link
      className="rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
      href={href}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </Link>
  );
}
