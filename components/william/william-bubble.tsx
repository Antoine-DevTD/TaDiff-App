"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WilliamTip } from "@/lib/william";

const toneDot: Record<WilliamTip["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-accent",
  success: "bg-success",
};

export function WilliamBubble({ tips }: { tips: WilliamTip[] }) {
  const [open, setOpen] = useState(false);
  const urgentCount = tips.filter((tip) => tip.tone === "danger" || tip.tone === "warning").length;

  return (
    <div className="fixed bottom-5 right-5 z-40 hidden flex-col items-end gap-3 sm:flex print:hidden">
      {open ? (
        <div className="w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-border bg-panel shadow-xl shadow-ink/20">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">William, ton copilote</p>
            </div>
            <button aria-label="Fermer" type="button" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto p-4">
            <p className="text-sm text-muted">
              Salut ! J&apos;ai regardé ta compagnie. Voici ce que je te conseille de faire
              maintenant :
            </p>
            {tips.map((tip) => (
              <Link
                key={tip.id}
                href={tip.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg border border-border bg-panel-strong/40 p-3 transition hover:border-accent/40 hover:bg-panel-strong/70"
              >
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneDot[tip.tone])} />
                  <div>
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{tip.detail}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Ouvrir William"
        className="william-bubble-button relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 transition hover:bg-accent-strong"
      >
        <Sparkles className="h-6 w-6" />
        {!open && urgentCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-white ring-2 ring-panel">
            {urgentCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
