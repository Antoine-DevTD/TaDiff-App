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

function TipLink({ tip, onSelect }: { tip: WilliamTip; onSelect: () => void }) {
  return (
    <Link
      className="flex items-start gap-2 rounded-md p-2 transition hover:bg-panel-strong/60"
      href={tip.href}
      onClick={onSelect}
    >
      <span
        aria-hidden="true"
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneDot[tip.tone])}
      />
      <span>
        <span className="block text-sm font-medium">{tip.title}</span>
        <span className="mt-0.5 block text-xs text-muted">{tip.detail}</span>
      </span>
    </Link>
  );
}

export function WilliamBubble({ tips }: { tips: WilliamTip[] }) {
  const [open, setOpen] = useState(false);
  const urgentCount = tips.filter((tip) => tip.tone === "danger" || tip.tone === "warning").length;
  const priorityTip = tips[0];
  const otherTips = tips.slice(1);

  return (
    <div className="fixed bottom-5 right-5 z-40 hidden flex-col items-end gap-3 sm:flex print:hidden">
      {open ? (
        <div
          id="william-panel"
          className="w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-lg border border-border bg-panel shadow-xl shadow-ink/20"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent px-4 py-1.5 text-white">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              <p className="text-sm font-semibold">William</p>
            </div>
            <button
              aria-label="Fermer William"
              className="flex h-11 w-11 items-center justify-center rounded-md transition hover:bg-white/15"
              title="Fermer"
              type="button"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto overscroll-contain p-4">
            <p className="text-xs font-semibold uppercase text-muted">Priorite suggeree</p>
            {priorityTip ? (
              <Link
                className="block rounded-lg border border-accent/30 bg-accent-soft/30 p-3 transition hover:border-accent/60 hover:bg-accent-soft/60"
                href={priorityTip.href}
                onClick={() => setOpen(false)}
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      toneDot[priorityTip.tone],
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{priorityTip.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{priorityTip.detail}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted">Aucune urgence detectee pour le moment.</p>
            )}

            {otherTips.length > 0 ? (
              <details className="group border-t border-border pt-3">
                <summary className="cursor-pointer list-none text-sm font-medium">
                  <span className="flex items-center justify-between gap-3">
                    {otherTips.length} autre{otherTips.length > 1 ? "s" : ""} point
                    {otherTips.length > 1 ? "s" : ""}
                    <span aria-hidden="true" className="text-muted transition group-open:rotate-180">
                      ↓
                    </span>
                  </span>
                </summary>
                <div className="mt-2 space-y-1">
                  {otherTips.map((tip) => (
                    <TipLink key={tip.id} tip={tip} onSelect={() => setOpen(false)} />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        aria-controls="william-panel"
        aria-expanded={open}
        aria-label={open ? "Fermer William" : "Ouvrir William"}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:bg-accent-strong",
          urgentCount > 0 && !open && "william-bubble-button",
        )}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <Sparkles aria-hidden="true" className="h-6 w-6" />
        {!open && urgentCount > 0 ? (
          <span
            aria-label={`${urgentCount} priorite${urgentCount > 1 ? "s" : ""}`}
            className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-white ring-2 ring-panel"
          >
            {urgentCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
