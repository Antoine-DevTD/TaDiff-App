"use client";

import { useState } from "react";
import { deleteFixedCost } from "@/app/(dashboard)/actions";
import { FixedCostForm } from "@/components/finance/fixed-cost-form";
import { InlineDeleteButton } from "@/components/ui/inline-delete-button";
import type { FixedCost } from "@/types";

export function FixedCostRowActions({ cost }: { cost: FixedCost }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <button
          className="text-sm font-medium text-accent transition hover:text-accent-strong"
          type="button"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? "Fermer" : "Modifier"}
        </button>
        <InlineDeleteButton action={deleteFixedCost.bind(null, cost.id)} />
      </div>
      {editing ? (
        <div className="rounded-md border border-border bg-panel p-4">
          <FixedCostForm cost={cost} onSaved={() => setEditing(false)} />
        </div>
      ) : null}
    </div>
  );
}
