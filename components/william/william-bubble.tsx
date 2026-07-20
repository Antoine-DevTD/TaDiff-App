"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  FileText,
  Landmark,
  Mail,
  Play,
  Theater,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { tourStartEvent } from "@/components/tour/guided-tour";
import { cn } from "@/lib/utils";
import type { WilliamTip } from "@/lib/william";

const toneDot: Record<WilliamTip["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-accent",
  success: "bg-success",
};

type WilliamAction = {
  detail: string;
  href: string;
  icon: LucideIcon;
  id: string;
  label: string;
  paths: string[];
};

const williamActions: WilliamAction[] = [
  {
    id: "email",
    label: "Preparer un email",
    detail: "Choisir un contact, un spectacle et les pieces a joindre.",
    href: "/campaigns",
    icon: Mail,
    paths: ["/contacts", "/campaigns", "/pipeline"],
  },
  {
    id: "date",
    label: "Faire avancer une date",
    detail: "Ajouter ou retrouver une proposition de representation.",
    href: "/pipeline",
    icon: CalendarPlus,
    paths: ["/pipeline", "/calendar", "/shows"],
  },
  {
    id: "show",
    label: "Ajouter un spectacle",
    detail: "Creer sa fiche et commencer son dossier.",
    href: "/shows?create=1",
    icon: Theater,
    paths: ["/shows", "/dashboard"],
  },
  {
    id: "documents",
    label: "Completer un dossier",
    detail: "Verifier les pieces manquantes de vos spectacles.",
    href: "/shows",
    icon: FileText,
    paths: ["/shows", "/subventions"],
  },
  {
    id: "grants",
    label: "Chercher une aide",
    detail: "Consulter les subventions et leurs echeances.",
    href: "/subventions",
    icon: Landmark,
    paths: ["/subventions", "/dashboard"],
  },
  {
    id: "treasury",
    label: "Verifier la tresorerie",
    detail: "Voir le solde, les frais fixes et la projection.",
    href: "/finances",
    icon: WalletCards,
    paths: ["/finances", "/dashboard"],
  },
];

function TipLink({ tip, onSelect }: { tip: WilliamTip; onSelect: () => void }) {
  return (
    <Link
      className="flex items-start gap-2 rounded-md p-2 transition hover:bg-panel-strong/60"
      href={tip.href}
      onClick={onSelect}
    >
      <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneDot[tip.tone])} />
      <span>
        <span className="block text-sm font-medium">{tip.title}</span>
        <span className="mt-0.5 block text-xs text-muted">{tip.detail}</span>
      </span>
    </Link>
  );
}

export function WilliamBubble({ tips }: { tips: WilliamTip[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const urgentCount = tips.filter((tip) => tip.tone === "danger" || tip.tone === "warning").length;
  const priorityTip = tips[0];
  const otherTips = tips.slice(1);
  const quickActions = [...williamActions]
    .sort((left, right) => {
      const leftMatches = left.paths.some((path) => pathname.startsWith(path));
      const rightMatches = right.paths.some((path) => pathname.startsWith(path));
      return Number(rightMatches) - Number(leftMatches);
    })
    .slice(0, 4);

  function startTour() {
    window.dispatchEvent(new Event(tourStartEvent));
    setOpen(false);
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5 print:hidden">
      {open ? (
        <div
          id="william-panel"
          aria-label="Assistant William"
          role="region"
          className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-panel shadow-xl shadow-ink/20"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent px-4 py-2 text-white">
            <div className="flex items-center gap-2.5">
              <TadiffMark className="h-7 w-7 ring-1 ring-white/25" />
              <div>
                <p className="text-sm font-semibold">William</p>
                <p className="text-[11px] text-white/75">Votre copilote TaDiff</p>
              </div>
            </div>
            <button
              aria-label="Fermer William"
              className="flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-white/15"
              title="Fermer"
              type="button"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[min(34rem,calc(100vh-9rem))] space-y-4 overflow-y-auto overscroll-contain p-4">
            <section aria-labelledby="william-priority-title">
              <p id="william-priority-title" className="text-xs font-semibold uppercase text-muted">Priorite suggeree</p>
              {priorityTip ? (
                <Link
                  className="mt-2 block rounded-lg border border-accent/30 bg-accent-soft/30 p-3 transition hover:border-accent/60 hover:bg-accent-soft/60"
                  href={priorityTip.href}
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneDot[priorityTip.tone])} />
                    <div>
                      <p className="text-sm font-medium">{priorityTip.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{priorityTip.detail}</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="mt-2 text-sm text-muted">Aucune urgence detectee pour le moment.</p>
              )}

              {otherTips.length > 0 ? (
                <details className="group mt-3 border-t border-border pt-3">
                  <summary className="cursor-pointer list-none text-sm font-medium">
                    <span className="flex items-center justify-between gap-3">
                      {otherTips.length} autre{otherTips.length > 1 ? "s" : ""} point{otherTips.length > 1 ? "s" : ""}
                      <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted transition group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="mt-2 space-y-1">
                    {otherTips.map((tip) => <TipLink key={tip.id} tip={tip} onSelect={() => setOpen(false)} />)}
                  </div>
                </details>
              ) : null}
            </section>

            <section className="border-t border-border pt-3" aria-labelledby="william-actions-title">
              <div className="flex items-center justify-between gap-3">
                <p id="william-actions-title" className="text-xs font-semibold uppercase text-muted">Agir maintenant</p>
                <button className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-strong" type="button" onClick={startTour}>
                  <Play aria-hidden="true" className="h-3.5 w-3.5" />
                  Visite guidee
                </button>
              </div>
              <div className="mt-2 divide-y divide-border">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.id} className="flex items-center gap-3 py-3 transition hover:text-accent" href={action.href} onClick={() => setOpen(false)}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-panel-strong text-accent">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{action.label}</span>
                        <span className="mt-0.5 block text-xs leading-4 text-muted">{action.detail}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
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
        <TadiffMark className="h-10 w-10 shadow-sm ring-1 ring-white/25" />
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
