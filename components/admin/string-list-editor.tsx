"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function StringListEditor({
  label,
  suggestions,
  value,
  onChange,
}: {
  label: string;
  suggestions: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [customValue, setCustomValue] = useState("");

  function toggle(item: string) {
    onChange(value.includes(item) ? value.filter((entry) => entry !== item) : [...value, item]);
  }

  function addCustom() {
    const item = customValue.trim();
    if (!item || value.some((entry) => entry.toLocaleLowerCase("fr") === item.toLocaleLowerCase("fr"))) return;
    onChange([...value, item]);
    setCustomValue("");
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((item) => {
          const selected = value.includes(item);
          return (
            <button
              key={item}
              aria-pressed={selected}
              className={cn(
                "min-h-10 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selected
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-panel hover:border-accent/45 hover:text-accent",
              )}
              type="button"
              onClick={() => toggle(item)}
            >
              {item}
            </button>
          );
        })}
      </div>

      {value.filter((item) => !suggestions.includes(item)).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.filter((item) => !suggestions.includes(item)).map((item) => (
            <button
              key={item}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-panel-strong px-3 py-1.5 text-sm"
              type="button"
              onClick={() => toggle(item)}
            >
              {item}
              <X className="h-3.5 w-3.5" aria-label={`Retirer ${item}`} />
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex max-w-lg gap-2">
        <Input
          aria-label={`Ajouter à ${label.toLocaleLowerCase("fr")}`}
          placeholder="Ajouter un élément personnalisé"
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
        />
        <Button aria-label="Ajouter" type="button" variant="secondary" onClick={addCustom}>
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </fieldset>
  );
}
