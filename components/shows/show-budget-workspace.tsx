"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteShowBudgetItem,
  saveShowBudgetItem,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  expenseBudgetCategories,
  getBudgetCategoryLabel,
  revenueBudgetCategories,
  type ShowBudgetItemValues,
} from "@/lib/validation/show-budget";
import type { ShowBudgetItem } from "@/types";

type BudgetKind = "expense" | "revenue";

const starterLines: Record<BudgetKind, Array<{ category: string; label: string }>> = {
  expense: [
    { category: "creation", label: "Répétitions rémunérées" },
    { category: "scenography", label: "Décor, accessoires ou costumes" },
    { category: "artistic", label: "Équipe artistique" },
  ],
  revenue: [
    { category: "own", label: "Apport de la compagnie" },
    { category: "coproduction", label: "Coproduction" },
    { category: "grants", label: "Subvention ou aide" },
  ],
};

export function ShowBudgetWorkspace({
  initialItems,
  showId,
  simpleBudget,
  weightedPipelineRevenue,
}: {
  initialItems: ShowBudgetItem[];
  showId: string;
  simpleBudget: number;
  weightedPipelineRevenue: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const expenses = items.filter((item) => item.kind === "expense");
  const revenues = items.filter((item) => item.kind === "revenue");
  const totalExpenses = expenses.reduce((total, item) => total + item.amount, 0);
  const totalRevenues = revenues.reduce((total, item) => total + item.amount, 0);
  const remaining = Math.max(totalExpenses - totalRevenues, 0);
  const surplus = Math.max(totalRevenues - totalExpenses, 0);
  const coverage = totalExpenses > 0 ? Math.min((totalRevenues / totalExpenses) * 100, 100) : 0;

  function updateItem(item: ShowBudgetItem) {
    setItems((current) => {
      const exists = current.some((entry) => entry.id === item.id);
      return exists
        ? current.map((entry) => (entry.id === item.id ? item : entry))
        : [...current, item];
    });
    router.refresh();
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="border-y border-border py-5">
        <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          <BudgetMetric
            label="Le spectacle coûte"
            value={formatCurrency(totalExpenses)}
            detail="Toutes les dépenses listées"
          />
          <BudgetMetric
            label="Déjà financé"
            value={formatCurrency(totalRevenues)}
            detail={`${Math.round(coverage)} % du budget couvert`}
            tone="success"
          />
          <BudgetMetric
            label={remaining > 0 ? "Reste à trouver" : "Marge disponible"}
            value={formatCurrency(remaining || surplus)}
            detail={remaining > 0 ? "Pour équilibrer le projet" : "Les entrées couvrent les dépenses"}
            tone={remaining > 0 ? "warning" : "success"}
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">Financement du projet</span>
            <span className="text-muted">{Math.round(coverage)} %</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-panel-strong">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${coverage}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
            <span>Enveloppe estimée au départ : {formatCurrency(simpleBudget)}</span>
            <span>
              Dates en discussion : {formatCurrency(weightedPipelineRevenue)} pondérés, non comptés dans les entrées
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <BudgetSection
          items={expenses}
          kind="expense"
          showId={showId}
          onDeleted={removeItem}
          onSaved={updateItem}
        />
        <div className="space-y-8">
          <BudgetSection
            items={revenues}
            kind="revenue"
            showId={showId}
            onDeleted={removeItem}
            onSaved={updateItem}
          />
          <ExpenseBreakdown items={expenses} />
        </div>
      </section>
    </div>
  );
}

function BudgetMetric({
  detail,
  label,
  tone = "neutral",
  value,
}: {
  detail: string;
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: string;
}) {
  return (
    <div className="bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        {tone === "neutral" ? null : <Badge tone={tone}>{tone === "success" ? "Bon repère" : "À compléter"}</Badge>}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}

function BudgetSection({
  items,
  kind,
  onDeleted,
  onSaved,
  showId,
}: {
  items: ShowBudgetItem[];
  kind: BudgetKind;
  onDeleted: (itemId: string) => void;
  onSaved: (item: ShowBudgetItem) => void;
  showId: string;
}) {
  const [editing, setEditing] = useState<ShowBudgetItem | null | undefined>(undefined);
  const title = kind === "expense" ? "Ce que le spectacle coûte" : "Ce qui finance le spectacle";
  const description =
    kind === "expense"
      ? "Commencez par les gros postes. Les petits détails pourront venir ensuite."
      : "Notez uniquement les entrées acquises ou raisonnablement prévues."

  return (
    <section aria-labelledby={`budget-${kind}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 id={`budget-${kind}-title`} className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{description}</p>
        </div>
        <Button className="gap-2" type="button" variant="secondary" onClick={() => setEditing(null)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {kind === "expense" ? "Ajouter une dépense" : "Ajouter une entrée"}
        </Button>
      </div>

      {items.length === 0 && editing === undefined ? (
        <div className="border-b border-border py-5">
          <p className="text-sm text-muted">Par quoi commencer ?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {starterLines[kind].map((starter) => (
              <button
                key={starter.label}
                className="min-h-10 rounded-md border border-border px-3 py-2 text-sm transition hover:border-accent/45 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                type="button"
                onClick={() =>
                  setEditing({
                    id: "",
                    showId,
                    kind,
                    category: starter.category,
                    label: starter.label,
                    amount: 0,
                    sortOrder: 0,
                  })
                }
              >
                + {starter.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        {items.map((item) => (
          <BudgetLine
            key={item.id}
            item={item}
            showId={showId}
            onDelete={onDeleted}
            onEdit={() => setEditing(item)}
          />
        ))}
      </div>

      {editing !== undefined ? (
        <BudgetLineEditor
          item={editing}
          kind={kind}
          showId={showId}
          onCancel={() => setEditing(undefined)}
          onSaved={(item) => {
            onSaved(item);
            setEditing(undefined);
          }}
        />
      ) : null}
    </section>
  );
}

function BudgetLine({
  item,
  onDelete,
  onEdit,
  showId,
}: {
  item: ShowBudgetItem;
  onDelete: (itemId: string) => void;
  onEdit: () => void;
  showId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="group flex min-h-16 items-center gap-3 border-b border-border py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.label}</p>
        <p className="mt-1 truncate text-xs text-muted">{getBudgetCategoryLabel(item.kind, item.category)}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</p>
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <button
          aria-label={`Modifier ${item.label}`}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-panel-strong hover:text-accent focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          title="Modifier"
          type="button"
          onClick={onEdit}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label={`Supprimer ${item.label}`}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger disabled:opacity-50"
          disabled={isPending}
          title="Supprimer"
          type="button"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteShowBudgetItem(showId, item.id);
              if (result.ok) onDelete(item.id);
            })
          }
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BudgetLineEditor({
  item,
  kind,
  onCancel,
  onSaved,
  showId,
}: {
  item: ShowBudgetItem | null;
  kind: BudgetKind;
  onCancel: () => void;
  onSaved: (item: ShowBudgetItem) => void;
  showId: string;
}) {
  const categories = kind === "expense" ? expenseBudgetCategories : revenueBudgetCategories;
  const [category, setCategory] = useState(item?.category ?? categories[0].value);
  const [label, setLabel] = useState(item?.label ?? "");
  const [amount, setAmount] = useState(item?.amount ? String(item.amount) : "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const values: ShowBudgetItemValues = {
      kind,
      category,
      label,
      amount: Number(amount),
    };

    startTransition(async () => {
      const result = await saveShowBudgetItem(showId, item?.id || null, values);
      if (!result.ok || !("item" in result) || !result.item) {
        setMessage(result.message);
        return;
      }
      onSaved(result.item);
    });
  }

  return (
    <form className="mt-4 border border-accent/30 bg-accent/5 p-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-[0.9fr_1.4fr_0.65fr]">
        <label className="text-sm font-medium">
          Catégorie
          <Select className="mt-2" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium">
          À quoi sert ce montant ?
          <Input className="mt-2" required value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Montant
          <Input className="mt-2" min="0" required step="10" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
      </div>
      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={isPending} type="submit">{item?.id ? "Enregistrer" : "Ajouter la ligne"}</Button>
        <Button disabled={isPending} type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

function ExpenseBreakdown({ items }: { items: ShowBudgetItem[] }) {
  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of items) totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [items]);
  const maxAmount = breakdown[0]?.amount ?? 0;

  return (
    <section aria-labelledby="budget-breakdown-title" className="border-t border-border pt-6">
      <h3 id="budget-breakdown-title" className="text-lg font-semibold">Répartition des dépenses</h3>
      <p className="mt-1 text-sm text-muted">Voyez immédiatement où part l&apos;essentiel du budget.</p>
      {breakdown.length === 0 ? (
        <p className="mt-4 border border-dashed border-border p-4 text-sm text-muted">Ajoutez une première dépense pour afficher la répartition.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {breakdown.map((entry) => (
            <div key={entry.category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{getBudgetCategoryLabel("expense", entry.category)}</span>
                <span className="shrink-0 font-medium tabular-nums">{formatCurrency(entry.amount)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel-strong">
                <div className="h-full rounded-full bg-accent" style={{ width: `${maxAmount > 0 ? (entry.amount / maxAmount) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

