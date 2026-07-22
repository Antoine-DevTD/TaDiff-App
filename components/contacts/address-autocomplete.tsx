"use client";

import { Check, LoaderCircle, MapPin, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AddressSuggestion = {
  id: string;
  label: string;
  address: string;
  postalCode: string;
  city: string;
  department: string;
  region: string;
  latitude: number;
  longitude: number;
};

export function AddressAutocomplete({
  hasCoordinates,
  onChange,
  onSelect,
  value,
}: {
  hasCoordinates: boolean;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  value: string;
}) {
  const listId = useId();
  const selectedValue = useRef(hasCoordinates ? value : "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || query === selectedValue.current) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/geocoding/address?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as { error?: string; suggestions?: AddressSuggestion[] };
        if (!response.ok) throw new Error(payload.error || "Recherche indisponible.");
        setSuggestions(payload.suggestions ?? []);
        setActiveIndex(payload.suggestions?.length ? 0 : -1);
        setOpen(true);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setError(fetchError instanceof Error ? fetchError.message : "Recherche indisponible.");
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function choose(suggestion: AddressSuggestion) {
    selectedValue.current = suggestion.address;
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onSelect(suggestion);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-[22px] z-[1] h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-label="Rechercher une adresse"
        autoComplete="off"
        className="pl-9 pr-10"
        placeholder="Commencez a saisir une rue ou une adresse..."
        role="combobox"
        value={value}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          selectedValue.current = "";
          onChange(event.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && suggestions.length) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => (current + 1) % suggestions.length);
          } else if (event.key === "ArrowUp" && suggestions.length) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
          } else if (event.key === "Enter" && open && activeIndex >= 0) {
            event.preventDefault();
            choose(suggestions[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <span className="pointer-events-none absolute right-3 top-[22px] -translate-y-1/2">
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-label="Recherche en cours" /> : hasCoordinates ? <Check className="h-4 w-4 text-success" aria-label="Adresse localisee" /> : null}
      </span>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-border bg-panel shadow-xl" id={listId} role="listbox">
          {error ? <p className="px-4 py-3 text-sm text-danger">{error}</p> : null}
          {!error && !loading && suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Aucune adresse trouvee. Vous pouvez continuer la saisie manuellement.</p>
          ) : null}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              id={`${listId}-${index}`}
              aria-selected={activeIndex === index}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-accent/[0.06]",
                activeIndex === index && "bg-accent/[0.06]",
              )}
              role="option"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(suggestion)}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block font-medium">{suggestion.address}</span>
                <span className="mt-0.5 block text-xs text-muted">{suggestion.postalCode} {suggestion.city}</span>
              </span>
            </button>
          ))}
          <p className="border-t border-border bg-panel-strong/40 px-4 py-2 text-[11px] text-muted">
            Adresses : Base Adresse Nationale, service IGN
          </p>
        </div>
      ) : null}
    </div>
  );
}
