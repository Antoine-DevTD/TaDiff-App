"use client";

import { useMemo, useState } from "react";
import { TreasuryBalanceForm } from "@/components/finance/treasury-balance-form";
import { TreasuryChart } from "@/components/finance/treasury-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PlannedFeatureBadge } from "@/components/ui/planned-feature";
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
      <Card className="space-y-5 p-5" data-tour="finance-tresorerie">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Trésorerie</p>
            <p className="mt-2 text-2xl font-semibold">
              {projection.status === "success"
                ? "La projection reste positive."
                : projection.status === "warning"
                  ? "La marge de sécurité se réduit."
                  : "Risque de passage dans le rouge."}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              La lecture reste volontairement simple : cash disponible, frais fixes,
              encaissements attendus et date de risque.
            </p>
          </div>
          <Badge tone={projection.status}>
            {projection.status === "success"
              ? "Vert"
              : projection.status === "warning"
                ? "Orange"
                : "Rouge"}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricPanel
            label="Cash actuel"
            value={formatCurrency(projection.currentCash)}
            detail={
              isDemoTreasury
                ? "Démo"
                : treasury
                  ? `Saisi le ${formatDate(treasury.recordedOn)}`
                  : "À renseigner"
            }
          />
          <MetricPanel
            label="Frais fixes / mois"
            value={formatCurrency(monthlyFixedCosts)}
            detail={`${fixedCosts.length} lignes`}
          />
          <MetricPanel
            label="Risque rouge"
            value={projection.riskDate.toLocaleDateString("fr-FR")}
            detail={`${projection.runwayDays} jours`}
          />
          <MetricPanel
            label="À encaisser 30 j"
            value={formatCurrency(projection.expectedQuotes30)}
            detail="Devis actifs"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <ProjectionCard label="Projection 30 j" value={projection.cash30} />
          <ProjectionCard label="Projection 60 j" value={projection.cash60} />
          <ProjectionCard label="Projection 90 j" value={projection.cash90} />
        </div>

        {isDemoTreasury ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <PlannedFeatureBadge kind="demo-data" />
            <span>Le solde est conservé pendant cette visite de démonstration.</span>
          </div>
        ) : treasury ? (
          <p className="text-xs text-muted">
            Solde saisi le {formatDate(treasury.recordedOn)}
            {treasury.note ? ` - ${treasury.note}` : ""}.
          </p>
        ) : (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            Aucun solde saisi : la projection part de 0 EUR.
          </p>
        )}
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

function ProjectionCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        <Badge tone={value >= 0 ? "success" : "danger"}>
          {value >= 0 ? "OK" : "Rouge"}
        </Badge>
      </div>
      <p className="mt-3 text-lg font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function MetricPanel({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR");
}
