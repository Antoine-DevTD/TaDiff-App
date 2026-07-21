"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CalendarPlus,
  ChevronDown,
  FileText,
  Landmark,
  Mail,
  Maximize2,
  Minimize2,
  Play,
  Send,
  Theater,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { tourStartEvent } from "@/components/tour/guided-tour";
import { cn } from "@/lib/utils";
import type { WilliamTip } from "@/lib/william";
import { askWilliamAction } from "@/app/(dashboard)/william/actions";

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

export function WilliamBubble({ aiEnabled, tips }: { aiEnabled: boolean; tips: WilliamTip[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [asking, startAsking] = useTransition();
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

  function askQuestion(nextQuestion: string) {
    const value = nextQuestion.trim();
    if (value.length < 3) return;
    setAnswerError(null);
    startAsking(async () => {
      const result = await askWilliamAction(value);
      if (!result.ok) {
        setAnswerError(result.message);
        return;
      }
      setAnswer(result.answer.text);
      setRemainingTokens(result.answer.remainingTokens);
      setQuestion("");
    });
  }

  function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askQuestion(question);
  }

  const suggestedQuestions = [
    ...tips.slice(0, 2).map((tip) => `Comment faire avancer : ${tip.title.toLocaleLowerCase("fr-FR")} ?`),
    "Quelles sont mes trois prochaines priorites ?",
    "Quel email puis-je preparer maintenant ?",
  ].slice(0, 4);

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5 print:hidden">
      {open ? (
        <div
          id="william-panel"
          aria-label="Assistant William"
          role="region"
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-panel shadow-xl shadow-ink/20 transition-[width,height] duration-300",
            expanded
              ? "h-[min(46rem,calc(100vh-2rem))] w-[min(58rem,calc(100vw-2rem))]"
              : "w-[22rem] max-w-[calc(100vw-2rem)]",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent px-4 py-2 text-white">
            <div className="flex items-center gap-2.5">
              <TadiffMark className="h-7 w-7 ring-1 ring-white/25" />
              <div>
                <p className="text-sm font-semibold">William</p>
                <p className="text-[11px] text-white/75">Votre copilote TaDiff</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label={expanded ? "Reduire William" : "Agrandir William"}
                className="flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-white/15"
                title={expanded ? "Reduire" : "Agrandir"}
                type="button"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? <Minimize2 aria-hidden="true" className="h-5 w-5" /> : <Maximize2 aria-hidden="true" className="h-5 w-5" />}
              </button>
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
          </div>

          <div className={cn("space-y-4 overflow-y-auto overscroll-contain p-4", expanded ? "h-[calc(100%-3.6rem)]" : "max-h-[min(34rem,calc(100vh-9rem))]")}>
            {aiEnabled ? (
              <section aria-labelledby="william-question-title">
                <p id="william-question-title" className="text-xs font-semibold uppercase text-muted">Demander a William</p>
                {answer ? (
                  <div className="mt-2 rounded-md border border-accent/25 bg-accent-soft/25 p-3 text-sm leading-6">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ children, href }) => <a className="font-medium text-accent underline underline-offset-2" href={href} rel="noreferrer" target="_blank">{children}</a>,
                        li: ({ children }) => <li className="ml-4 pl-1">{children}</li>,
                        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1">{children}</ol>,
                        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        ul: ({ children }) => <ul className="my-2 list-disc space-y-1">{children}</ul>,
                      }}
                    >
                      {answer}
                    </ReactMarkdown>
                  </div>
                ) : null}
                {answerError ? <p className="mt-2 rounded-md bg-danger/10 p-3 text-sm text-danger" role="alert">{answerError}</p> : null}
                <form className="mt-2 flex items-end gap-2" onSubmit={submitQuestion}>
                  <label className="sr-only" htmlFor="william-question">Votre question</label>
                  <textarea
                    id="william-question"
                    className="min-h-20 flex-1 resize-y rounded-md border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
                    maxLength={12000}
                    placeholder="Quelle aide correspond a mon spectacle ?"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <button
                    aria-label="Envoyer a William"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-white transition hover:bg-accent-strong disabled:opacity-50"
                    disabled={asking || question.trim().length < 3}
                    title="Envoyer"
                    type="submit"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                {remainingTokens !== null ? <p className="mt-2 text-[11px] text-muted">{new Intl.NumberFormat("fr-FR").format(remainingTokens)} credits disponibles</p> : null}
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Questions suggerees">
                  {suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="rounded-full border border-border bg-panel-strong px-3 py-1.5 text-left text-xs font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
                      disabled={asking}
                      type="button"
                      onClick={() => askQuestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {!aiEnabled ? <section aria-labelledby="william-priority-title">
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
            </section> : null}

            <section className="border-t border-border pt-3" aria-labelledby="william-actions-title">
              <div className="flex items-center justify-between gap-3">
                <p id="william-actions-title" className="text-xs font-semibold uppercase text-muted">Agir maintenant</p>
                <button className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-strong" type="button" onClick={startTour}>
                  <Play aria-hidden="true" className="h-3.5 w-3.5" />
                  Visite guidee
                </button>
              </div>
              {!aiEnabled ? <div className="mt-2 divide-y divide-border">
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
              </div> : <p className="mt-2 text-sm leading-6 text-muted">Posez votre question avec vos mots. William consulte l&apos;etat de votre compagnie avant de vous proposer une prochaine etape.</p>}
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
