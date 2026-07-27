"use client";

import { useMemo, useState } from "react";
import { TreasuryBalanceForm } from "@/components/finance/treasury-balance-form";
import { TreasuryChart } from "@/components/finance/treasury-chart";
import { Card } from "@/components/ui/card";
import {
  buildTreasuryProjection,
  formatCurrency,
  getMonthlyFixedCostsTotal,
} from "@/lib/finance";
import type { FixedCost, GrantOpportunity, QuoteItem, TreasurySnapshot } from "@/types";

export function TreasuryOverview({
  fixedCosts,
  grants,
  initialHistory,
  initialTreasury,
  isDemoTreasury,
  quotes,
}: {
  fixedCosts: FixedCost[];
  grants: GrantOpportunity[];
  initialHistory: TreasurySnapshot[];
  initialTreasury: TreasurySnapshot | null;
  isDemoTreasury: boolean;
  quotes: QuoteItem[];
}) {
  const [treasury, setTreasury] = useState(initialTreasury);
  const [history, setHistory] = useState(initialHistory);
  const monthlyFixedCosts = getMonthlyFixedCostsTotal(fixedCosts);
  const projection = useMemo(
    () =>
      buildTreasuryProjection({
        currentCash: treasury?.balance ?? 0,
        fixedCosts,
        grants,
        quotes,
      }),
    [fixedCosts, grants, quotes, treasury],
  );

  function recordSnapshot(snapshot: TreasurySnapshot) {
    setTreasury(snapshot);
    setHistory((current) => [
      ...current.filter((item) => item.id !== snapshot.id),
      snapshot,
    ]);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden p-0" data-tour="finance-tresorerie">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
              <div className="flex flex-col justify-between gap-[1.375rem] bg-ink p-5 text-white">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                      Solde actuel
                    </p>
                    <span
                      className={
                        projection.status === "success"
                          ? "h-2.5 w-2.5 rounded-full bg-success"
                          : projection.status === "warning"
                            ? "h-2.5 w-2.5 rounded-full bg-warning"
                            : "h-2.5 w-2.5 rounded-full bg-danger"
                      }
                      aria-hidden
                    />
                  </div>
                  <p className="mt-4 text-4xl font-semibold leading-none tabular-nums">
                    {formatCurrency(projection.currentCash)}
                  </p>
                  <p className="mt-2 text-sm text-white/65">
                    {projection.status === "success"
                      ? "La projection reste positive."
                      : projection.status === "warning"
                        ? "La marge se réduit."
                        : "Un risque est identifié."}
                  </p>
                </div>
                <p className="text-xs text-white/55">
                  {isDemoTreasury
                    ? "Donnée de démonstration"
                    : treasury
                      ? `Mis à jour le ${formatDate(treasury.recordedOn)}`
                      : "Solde à renseigner"}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <p className="text-sm text-muted">Autonomie estimée</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {projection.runwayDays} jours
                    </p>
                  </div>
                  <p className="text-right text-xs text-muted">
                    Risque le
                    <br />
                    <span className="font-semibold text-foreground">
                      {projection.riskDate.toLocaleDateString("fr-FR")}
                    </span>
                  </p>
                </div>

                <div className="divide-y divide-border">
                  {[
                    ["Dans 30 jours", projection.cash30],
                    ["Dans 60 jours", projection.cash60],
                    ["Dans 90 jours", projection.cash90],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-muted">{label}</span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-[1.375rem] border-t border-border pt-4 text-sm">
                  <p>
                    <span className="block text-xs text-muted">Frais fixes / mois</span>
                    <span className="mt-1 block font-semibold tabular-nums">
                      {formatCurrency(monthlyFixedCosts)}
                    </span>
                  </p>
                  <p>
                    <span className="block text-xs text-muted">À encaisser sous 30 j</span>
                    <span className="mt-1 block font-semibold tabular-nums">
                      {formatCurrency(projection.expectedQuotes30)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
      </Card>

      <div className="space-y-6">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Suivi de trésorerie</p>
            <p className="mt-1 text-sm text-muted">Évolution du solde à chaque saisie.</p>
          </div>
          <TreasuryChart snapshots={history} />
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Mettre à jour le solde</p>
            <p className="mt-1 text-sm text-muted">
              Le solde bancaire saisi alimente immédiatement le cockpit et les projections.
            </p>
          </div>
          <TreasuryBalanceForm
            currentBalance={treasury?.balance ?? null}
            onRecorded={recordSnapshot}
          />
        </Card>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR");
}
