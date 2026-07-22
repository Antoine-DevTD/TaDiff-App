"use client";

import { Send, Sparkles, X } from "lucide-react";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { Button } from "@/components/ui/button";

export function WilliamRequestPanel({
  actionLabel = "Demander à William",
  context,
  description,
  onCancel,
  onChange,
  onSubmit,
  open,
  pending,
  placeholder,
  title,
  value,
}: {
  actionLabel?: string;
  context: string[];
  description: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  open: boolean;
  pending: boolean;
  placeholder: string;
  title: string;
  value: string;
}) {
  if (!open) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-accent/30 bg-accent-soft/20" aria-label={title}>
      <div className="flex items-start justify-between gap-4 border-b border-accent/20 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <TadiffMark className="h-9 w-9 shrink-0 shadow-sm" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>
          </div>
        </div>
        <button
          aria-label="Fermer la demande à William"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted transition hover:bg-panel hover:text-foreground"
          type="button"
          onClick={onCancel}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        {context.length > 0 ? (
          <div className="flex flex-wrap gap-2" aria-label="Contexte utilisé par William">
            {context.map((item) => (
              <span key={item} className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-muted">
                {item}
              </span>
            ))}
          </div>
        ) : null}
        <label className="block text-sm font-medium">
          Votre demande
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-md border border-border bg-panel px-3 py-2 text-sm leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            maxLength={2000}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!pending && value.trim().length >= 3) onSubmit();
              }
            }}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Entrée pour envoyer, Maj + Entrée pour une nouvelle ligne.</p>
          <Button disabled={pending || value.trim().length < 3} type="button" onClick={onSubmit}>
            {pending ? <Sparkles aria-hidden="true" className="mr-2 h-4 w-4 animate-pulse motion-reduce:animate-none" /> : <Send aria-hidden="true" className="mr-2 h-4 w-4" />}
            {pending ? "William prépare..." : actionLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
