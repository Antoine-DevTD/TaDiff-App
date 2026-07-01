"use client";

import { useMemo, useState } from "react";
import { defaultCostProfile } from "@/data/mock-data";
import {
  calculateProfitability,
  formatCurrency,
  getVerdictMeta,
  strategicTagLabels,
} from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CalculatorState = {
  artistFees: number;
  commissionRate: number;
  distanceKm: number;
  hotelNights: number;
  performanceCount: number;
  production: number;
  rights: number;
  salePrice: number;
  subsidyRevenue: number;
  technicalFees: number;
  workshopRevenue: number;
};

const initialState: CalculatorState = {
  artistFees: defaultCostProfile.artistFees,
  commissionRate: defaultCostProfile.tourCommissionRate * 100,
  distanceKm: 180,
  hotelNights: 1,
  performanceCount: 1,
  production: defaultCostProfile.production,
  rights: defaultCostProfile.rights,
  salePrice: 2800,
  subsidyRevenue: 0,
  technicalFees: defaultCostProfile.technicalFees,
  workshopRevenue: 0,
};

export function ProfitabilityCalculator({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState(initialState);
  const [strategicTags, setStrategicTags] = useState<string[]>([]);

  const result = useMemo(
    () =>
      calculateProfitability({
        salePrice: state.salePrice,
        performanceCount: state.performanceCount,
        distanceKm: state.distanceKm,
        hotelNights: state.hotelNights,
        workshopRevenue: state.workshopRevenue,
        subsidyRevenue: state.subsidyRevenue,
        strategicTags,
        costProfile: {
          ...defaultCostProfile,
          artistFees: state.artistFees,
          technicalFees: state.technicalFees,
          rights: state.rights,
          production: state.production,
          tourCommissionRate: state.commissionRate / 100,
        },
      }),
    [state, strategicTags],
  );

  const verdict = getVerdictMeta(result.verdict);

  function updateField(field: keyof CalculatorState, value: string) {
    setState((current) => ({
      ...current,
      [field]: Number(value) || 0,
    }));
  }

  function toggleTag(label: string) {
    setStrategicTags((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  return (
    <div className={compact ? "grid gap-4 xl:grid-cols-[1fr_0.85fr]" : "grid gap-6 xl:grid-cols-[1fr_0.9fr]"}>
      <Card className="space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Calculateur de rentabilite</p>
          <h2 className={compact ? "mt-2 text-xl font-semibold" : "mt-2 text-2xl font-semibold"}>
            Classez une date avant de signer.
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <NumberField label="Prix de cession" value={state.salePrice} onChange={(value) => updateField("salePrice", value)} />
          <NumberField label="Nb representations" value={state.performanceCount} onChange={(value) => updateField("performanceCount", value)} />
          <NumberField label="Distance km" value={state.distanceKm} onChange={(value) => updateField("distanceKm", value)} />
          <NumberField label="Nuits hotel" value={state.hotelNights} onChange={(value) => updateField("hotelNights", value)} />
          <NumberField label="Recettes ateliers" value={state.workshopRevenue} onChange={(value) => updateField("workshopRevenue", value)} />
          <NumberField label="Subvention liee" value={state.subsidyRevenue} onChange={(value) => updateField("subsidyRevenue", value)} />
        </div>

        <details className="rounded-md border border-border bg-panel-strong/45 p-4">
          <summary className="cursor-pointer text-sm font-semibold">Structure de couts</summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <NumberField label="Salaires artistes" value={state.artistFees} onChange={(value) => updateField("artistFees", value)} />
            <NumberField label="Salaires tech" value={state.technicalFees} onChange={(value) => updateField("technicalFees", value)} />
            <NumberField label="Droits auteurs" value={state.rights} onChange={(value) => updateField("rights", value)} />
            <NumberField label="Production" value={state.production} onChange={(value) => updateField("production", value)} />
            <NumberField label="Commission tourneur %" value={state.commissionRate} onChange={(value) => updateField("commissionRate", value)} />
          </div>
        </details>

        <div>
          <p className="text-sm font-medium">Tags strategiques</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {strategicTagLabels.map((label) => (
              <button
                key={label}
                className={
                  strategicTags.includes(label)
                    ? "rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-border bg-panel px-3 py-1.5 text-xs text-muted hover:bg-panel-strong hover:text-foreground"
                }
                type="button"
                onClick={() => toggleTag(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4 bg-ink p-5 text-white">
        <div className="rounded-lg bg-white p-5 text-ink">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Verdict</p>
            <Badge tone={verdict.tone}>{verdict.label}</Badge>
          </div>
          <p className="mt-4 text-4xl font-semibold tracking-tight">
            {result.margin >= 0 ? "+" : ""}
            {formatCurrency(result.margin)}
          </p>
          <p className="mt-2 text-sm text-muted">
            Marge {result.marginRate.toFixed(1)}%. Point mort a {formatCurrency(result.breakEven)}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <ResultCell label="Recettes" value={formatCurrency(result.grossRevenue)} />
          <ResultCell label="Couts" value={formatCurrency(result.totalCost)} />
          <ResultCell label="Cout fixe" value={formatCurrency(result.fixedCost)} />
          <ResultCell label="Commission" value={formatCurrency(result.commissionCost)} />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/8 p-4">
          <p className="text-sm font-semibold">Actions correctives</p>
          <div className="mt-3 space-y-2 text-sm text-white/72">
            {result.suggestions.map((suggestion) => (
              <p key={suggestion}>- {suggestion}</p>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <Input
        className="mt-2"
        min="0"
        step="1"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/8 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
