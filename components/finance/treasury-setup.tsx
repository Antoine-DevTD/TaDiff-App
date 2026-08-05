"use client";

import { ArrowLeft, ArrowRight, Check, Landmark, WalletCards } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { completeTreasurySetup } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FixedCostCategory, FixedCostFrequency } from "@/types";

type CostPreset = {
  id: string;
  label: string;
  category: FixedCostCategory;
};

type CostDraft = CostPreset & {
  amount: string;
  frequency: FixedCostFrequency;
  nextDueDate: string;
};

const presets: CostPreset[] = [
  { id: "insurance", label: "Assurance de la compagnie", category: "Assurance" },
  { id: "accountant", label: "Comptable", category: "Comptable" },
  { id: "bank", label: "Frais bancaires", category: "Banque" },
  { id: "storage", label: "Stockage en ligne", category: "Stockage" },
  { id: "software", label: "Logiciels et abonnements", category: "Logiciel" },
  { id: "office", label: "Local ou bureau", category: "Local" },
  { id: "salary", label: "Salaires permanents", category: "Salaire" },
  { id: "phone", label: "Telephone et internet", category: "Autre" },
];

function defaultDueDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export function TreasurySetup() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CostDraft>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCosts = useMemo(
    () => selectedIds.map((id) => drafts[id]).filter((cost): cost is CostDraft => Boolean(cost)),
    [drafts, selectedIds],
  );

  function togglePreset(preset: CostPreset) {
    setMessage(null);
    setSelectedIds((current) =>
      current.includes(preset.id)
        ? current.filter((id) => id !== preset.id)
        : [...current, preset.id],
    );
    setDrafts((current) => ({
      ...current,
      [preset.id]: current[preset.id] ?? {
        ...preset,
        amount: "",
        frequency: "Mensuel",
        nextDueDate: defaultDueDate(),
      },
    }));
  }

  function updateDraft(id: string, patch: Partial<CostDraft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setMessage(null);
  }

  function goNext() {
    if (step === 0 && (balance.trim() === "" || !Number.isFinite(Number(balance)))) {
      setMessage("Indiquez le solde visible aujourd’hui sur le compte bancaire de la compagnie.");
      return;
    }
    setMessage(null);
    setStep((current) => Math.min(2, current + 1));
  }

  function submit() {
    const incompleteCost = selectedCosts.find(
      (cost) => cost.amount.trim() === "" || Number(cost.amount) < 0 || !cost.nextDueDate,
    );
    if (incompleteCost) {
      setMessage(`Complétez le montant et la prochaine échéance pour « ${incompleteCost.label} ».`);
      return;
    }

    startTransition(async () => {
      setMessage("Enregistrement de vos repères de trésorerie...");
      const result = await completeTreasurySetup({
        balance: Number(balance),
        fixedCosts: selectedCosts.map((cost) => ({
          label: cost.label,
          category: cost.category,
          amount: Number(cost.amount),
          frequency: cost.frequency,
          nextDueDate: cost.nextDueDate,
          notes: "Ajoute pendant la prise en main de la tresorerie",
        })),
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-border bg-panel shadow-sm shadow-ink/10">
      <div className="grid min-h-[620px] lg:grid-cols-[0.38fr_0.62fr]">
        <div className="flex flex-col justify-between bg-ink p-6 text-white sm:p-8">
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-md bg-white/10">
              <Landmark className="h-5 w-5" aria-hidden />
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Posons vos repères de trésorerie.</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              En moins de cinq minutes, TaDiff pourra projeter votre solde et vous signaler les
              périodes fragiles.
            </p>
          </div>
          <div className="mt-8 space-y-3 text-sm">
            {["Solde actuel", "Charges récurrentes", "Montants et échéances"].map((label, index) => (
              <div key={label} className={cn("flex items-center gap-3", index > step && "text-white/45")}>
                <span className={cn(
                  "grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold",
                  index < step && "border-success bg-success text-white",
                  index === step && "border-white bg-white text-ink",
                  index > step && "border-white/25",
                )}>
                  {index < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex-1">
            {step === 0 ? (
              <div>
                <WalletCards className="h-6 w-6 text-accent" aria-hidden />
                <h2 className="mt-5 text-xl font-semibold">Quel est votre solde aujourd’hui ?</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Reprenez simplement le montant disponible sur le compte bancaire principal. Un
                  solde négatif est accepté.
                </p>
                <label className="mt-8 block max-w-sm text-sm font-medium">
                  Solde bancaire actuel
                  <div className="relative mt-2">
                    <Input
                      autoFocus
                      className="pr-12 text-lg tabular-nums"
                      inputMode="decimal"
                      placeholder="0,00"
                      step="0.01"
                      type="number"
                      value={balance}
                      onChange={(event) => {
                        setBalance(event.target.value);
                        setMessage(null);
                      }}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">EUR</span>
                  </div>
                </label>
              </div>
            ) : step === 1 ? (
              <div>
                <h2 className="text-xl font-semibold">Que payez-vous regulierement ?</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Sélectionnez uniquement ce qui concerne la compagnie. Vous pourrez compléter la
                  liste plus tard.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {presets.map((preset) => {
                    const selected = selectedIds.includes(preset.id);
                    return (
                      <button
                        key={preset.id}
                        aria-pressed={selected}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-md border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                          selected
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border bg-panel hover:border-accent/40 hover:bg-panel-strong/40",
                        )}
                        type="button"
                        onClick={() => togglePreset(preset)}
                      >
                        <span className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded border",
                          selected ? "border-accent bg-accent text-white" : "border-border",
                        )}>
                          {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                        </span>
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold">Combien et quand ?</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Indiquez le montant réellement débité et la prochaine date de paiement connue.
                </p>
                {selectedCosts.length === 0 ? (
                  <div className="mt-8 rounded-md border border-dashed border-border bg-panel-strong/35 p-5 text-sm text-muted">
                    Aucun frais fixe sélectionné. Votre solde sera tout de même enregistré.
                  </div>
                ) : (
                  <div className="mt-6 divide-y divide-border border-y border-border">
                    {selectedCosts.map((cost) => (
                      <fieldset key={cost.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_0.7fr_1fr]">
                        <legend className="mb-3 w-full text-sm font-semibold sm:col-span-3">{cost.label}</legend>
                        <label className="text-xs font-medium text-muted">
                          Montant
                          <Input
                            className="mt-2"
                            min="0"
                            placeholder="0,00 EUR"
                            step="0.01"
                            type="number"
                            value={cost.amount}
                            onChange={(event) => updateDraft(cost.id, { amount: event.target.value })}
                          />
                        </label>
                        <label className="text-xs font-medium text-muted">
                          Frequence
                          <Select
                            className="mt-2"
                            value={cost.frequency}
                            onChange={(event) => updateDraft(cost.id, { frequency: event.target.value as FixedCostFrequency })}
                          >
                            <option value="Mensuel">Mensuel</option>
                            <option value="Trimestriel">Trimestriel</option>
                            <option value="Annuel">Annuel</option>
                          </Select>
                        </label>
                        <label className="text-xs font-medium text-muted">
                          Prochaine échéance
                          <Input
                            className="mt-2"
                            type="date"
                            value={cost.nextDueDate}
                            onChange={(event) => updateDraft(cost.id, { nextDueDate: event.target.value })}
                          />
                        </label>
                      </fieldset>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {message ? <p aria-live="polite" className="mt-5 text-sm text-danger">{message}</p> : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            {step === 0 ? (
              <Link className="text-sm font-medium text-muted hover:text-foreground hover:underline" href="/dashboard">
                Je le ferai plus tard
              </Link>
            ) : (
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => setStep((current) => current - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                Retour
              </Button>
            )}

            {step < 2 ? (
              <Button type="button" onClick={goNext}>
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button type="button" disabled={isPending} onClick={submit}>
                {isPending ? "Enregistrement..." : "Voir ma projection"}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
