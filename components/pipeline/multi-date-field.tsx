"use client";

import { CalendarDays, Plus, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MultiDateField({
  dates,
  label = "Dates de représentation",
  onChange,
}: {
  dates: string[];
  label?: string;
  onChange: (dates: string[]) => void;
}) {
  const rows = useMemo(() => dates.length > 0 ? dates : [""], [dates]);

  function update(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    const normalized = Array.from(new Set(next.filter(Boolean))).sort();
    onChange(value && index === rows.length - 1 ? [...normalized, ""] : normalized);
  }

  function remove(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index).filter(Boolean));
  }

  return (
    <fieldset className="rounded-md border border-border bg-panel-strong/35 p-4">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <div className="mt-2 flex gap-3 text-sm text-muted">
        <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>Renseignez plusieurs dates à la suite. Une nouvelle ligne apparaît automatiquement, sans passer par un agenda.</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((date, index) => (
          <div className="flex items-center gap-1" key={index}>
            <Input
              aria-label={`Représentation ${index + 1}`}
              type="date"
              value={date}
              onChange={(event) => update(index, event.target.value)}
            />
            {(date || rows.length > 1) ? (
              <button aria-label={`Retirer la date ${index + 1}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-danger/10 hover:text-danger" type="button" onClick={() => remove(index)}>
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{dates.filter(Boolean).length} date(s) renseignée(s)</p>
        <Button type="button" variant="ghost" onClick={() => onChange([...dates.filter(Boolean), ""])}>
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />Ajouter une ligne
        </Button>
      </div>
    </fieldset>
  );
}
