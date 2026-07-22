"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Maximize2, Minimize2, Send, X } from "lucide-react";
import { askWilliamAction } from "@/app/(dashboard)/william/actions";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { cn } from "@/lib/utils";
import type { WilliamTip } from "@/lib/william";

const toneDot: Record<WilliamTip["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-accent",
  success: "bg-success",
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function TipLink({ tip, onSelect }: { tip: WilliamTip; onSelect: () => void }) {
  return (
    <Link className="flex items-start gap-2 rounded-md p-2 transition hover:bg-panel-strong/60" href={tip.href} onClick={onSelect}>
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [answerToReveal, setAnswerToReveal] = useState<{ id: string; text: string } | null>(null);
  const [asking, startAsking] = useTransition();
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const messageSequenceRef = useRef(0);
  const urgentCount = tips.filter((tip) => tip.tone === "danger" || tip.tone === "warning").length;
  const priorityTip = tips[0];
  const otherTips = tips.slice(1);
  const revealing = Boolean(answerToReveal);

  const suggestedQuestions = [
    ...tips.slice(0, 2).map((tip) => `Comment faire avancer : ${tip.title.toLocaleLowerCase("fr-FR")} ?`),
    "Quelles sont mes trois prochaines priorités ?",
    "Quel email puis-je préparer maintenant ?",
  ].slice(0, 4);

  useEffect(() => {
    if (!answerToReveal) return;
    const { id, text } = answerToReveal;
    const words = text.match(/\S+\s*/g) ?? [text];
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      const partial = words.slice(0, index).join("");
      setMessages((current) => current.map((message) => message.id === id ? { ...message, text: partial } : message));
      if (index >= words.length) {
        window.clearInterval(interval);
        setAnswerToReveal(null);
      }
    }, 24);

    return () => window.clearInterval(interval);
  }, [answerToReveal]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [answerError, asking, messages]);

  function askQuestion(nextQuestion: string) {
    const value = nextQuestion.trim();
    if (value.length < 3 || asking || revealing) return;
    messageSequenceRef.current += 1;
    const userMessage: ChatMessage = { id: `user-${messageSequenceRef.current}`, role: "user", text: value };
    setMessages((current) => [...current, userMessage]);
    setAnswerError(null);
    setQuestion("");
    startAsking(async () => {
      const result = await askWilliamAction(value);
      if (!result.ok) {
        setAnswerError(result.message);
        return;
      }
      setRemainingTokens(result.answer.remainingTokens);
      messageSequenceRef.current += 1;
      const answerId = `william-${messageSequenceRef.current}`;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMessages((current) => [...current, { id: answerId, role: "assistant", text: result.answer.text }]);
      } else {
        setMessages((current) => [...current, { id: answerId, role: "assistant", text: "" }]);
        setAnswerToReveal({ id: answerId, text: result.answer.text });
      }
    });
  }

  function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askQuestion(question);
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5 print:hidden">
      {open ? (
        <div
          id="william-panel"
          aria-label="Assistant William"
          role="region"
          className={cn(
            "flex overflow-hidden rounded-lg border border-border bg-panel shadow-xl shadow-ink/20 transition-[width,height] duration-300 motion-reduce:transition-none",
            expanded
              ? "h-[min(48rem,calc(100vh-2rem))] w-[min(58rem,calc(100vw-2rem))]"
              : "h-[min(40rem,calc(100vh-8rem))] w-[24rem] max-w-[calc(100vw-2rem)]",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-border bg-ink px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <TadiffMark className="h-9 w-9 shrink-0 ring-1 ring-white/20" />
                <div className="min-w-0">
                  <p className="font-semibold">William</p>
                  <p className="truncate text-xs text-white/65">Vos spectacles et votre compagnie en contexte</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label={expanded ? "Réduire William" : "Agrandir William"} className="grid h-10 w-10 place-items-center rounded-md transition hover:bg-white/10" title={expanded ? "Réduire" : "Agrandir"} type="button" onClick={() => setExpanded((value) => !value)}>
                  {expanded ? <Minimize2 aria-hidden="true" className="h-5 w-5" /> : <Maximize2 aria-hidden="true" className="h-5 w-5" />}
                </button>
                <button aria-label="Fermer William" className="grid h-10 w-10 place-items-center rounded-md transition hover:bg-white/10" title="Fermer" type="button" onClick={() => setOpen(false)}>
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </header>

            {aiEnabled ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-panel-strong/35 px-4 py-5" aria-live="polite">
                  {messages.length === 0 && !asking ? (
                    <div className="mx-auto max-w-lg py-3">
                      <div className="flex items-center gap-3">
                        <TadiffMark className="h-10 w-10 shrink-0" />
                        <div><p className="font-semibold">Que voulez-vous faire avancer ?</p><p className="mt-1 text-sm leading-6 text-muted">Je consulte les informations de votre compagnie avant de vous répondre.</p></div>
                      </div>
                      <div className="mt-5 grid gap-2">
                        {suggestedQuestions.map((suggestion) => (
                          <button key={suggestion} className="rounded-md border border-border bg-panel px-3 py-2.5 text-left text-sm transition hover:border-accent/50 hover:bg-accent-soft/20 disabled:opacity-50" disabled={asking || revealing} type="button" onClick={() => askQuestion(suggestion)}>{suggestion}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto space-y-4" style={{ maxWidth: expanded ? "46rem" : "100%" }}>
                      {messages.map((message) => message.role === "user" ? (
                        <div key={message.id} className="ml-auto max-w-[88%] rounded-lg rounded-br-sm bg-accent px-3.5 py-2.5 text-sm leading-6 text-white">{message.text}</div>
                      ) : (
                        <div key={message.id} className="flex items-start gap-2.5">
                          <TadiffMark className="mt-0.5 h-7 w-7 shrink-0" />
                          <div className="min-w-0 flex-1 rounded-lg rounded-tl-sm border border-border bg-panel px-3.5 py-2.5 text-sm leading-6">
                            <WilliamMarkdown>{message.text}</WilliamMarkdown>
                            {revealing && messages.at(-1)?.id === message.id ? <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent motion-reduce:animate-none" /> : null}
                          </div>
                        </div>
                      ))}
                      {asking ? (
                        <div className="flex items-start gap-2.5">
                          <TadiffMark className="h-7 w-7 shrink-0" />
                          <div className="flex h-10 items-center gap-1 rounded-lg rounded-tl-sm border border-border bg-panel px-4" aria-label="William prépare sa réponse">
                            {[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent motion-reduce:animate-none" style={{ animationDelay: `${dot * 120}ms` }} />)}
                          </div>
                        </div>
                      ) : null}
                      {answerError ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{answerError}</p> : null}
                      <div ref={conversationEndRef} />
                    </div>
                  )}
                </div>
                <form className="border-t border-border bg-panel p-3" onSubmit={submitQuestion}>
                  <div className="flex items-end gap-2 rounded-lg border border-border bg-panel px-3 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
                    <label className="sr-only" htmlFor="william-question">Votre question</label>
                    <textarea
                      id="william-question"
                      className="max-h-36 min-h-12 flex-1 resize-none bg-transparent py-2 text-sm leading-5 outline-none"
                      maxLength={12000}
                      placeholder="Demandez à William..."
                      rows={2}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          askQuestion(question);
                        }
                      }}
                    />
                    <button aria-label="Envoyer à William" className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-white transition hover:bg-accent-strong disabled:opacity-40" disabled={asking || revealing || question.trim().length < 3} title="Envoyer" type="submit"><Send className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-muted">
                    <span>Entrée pour envoyer · Maj + Entrée pour une ligne</span>
                    {remainingTokens !== null ? <span className="shrink-0">{new Intl.NumberFormat("fr-FR").format(remainingTokens)} crédits</span> : null}
                  </div>
                </form>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <p className="text-xs font-semibold uppercase text-muted">Priorité suggérée</p>
                {priorityTip ? <TipLink tip={priorityTip} onSelect={() => setOpen(false)} /> : <p className="mt-3 text-sm text-muted">Aucune urgence détectée pour le moment.</p>}
                {otherTips.length > 0 ? (
                  <details className="group mt-3 border-t border-border pt-3">
                    <summary className="cursor-pointer list-none text-sm font-medium"><span className="flex items-center justify-between gap-3">{otherTips.length} autre{otherTips.length > 1 ? "s" : ""} point{otherTips.length > 1 ? "s" : ""}<ChevronDown aria-hidden="true" className="h-4 w-4 text-muted transition group-open:rotate-180" /></span></summary>
                    <div className="mt-2 space-y-1">{otherTips.map((tip) => <TipLink key={tip.id} tip={tip} onSelect={() => setOpen(false)} />)}</div>
                  </details>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <button
        aria-controls="william-panel"
        aria-expanded={open}
        aria-label={open ? "Fermer William" : "Ouvrir William"}
        className={cn("relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:bg-accent-strong", urgentCount > 0 && !open && "william-bubble-button")}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <TadiffMark className="h-10 w-10 shadow-sm ring-1 ring-white/25" />
        {!open && urgentCount > 0 ? <span aria-label={`${urgentCount} priorité${urgentCount > 1 ? "s" : ""}`} className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-white ring-2 ring-panel">{urgentCount}</span> : null}
      </button>
    </div>
  );
}

function WilliamMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children: linkChildren, href }) => <a className="font-medium text-accent underline underline-offset-2" href={href} rel="noreferrer" target="_blank">{linkChildren}</a>,
        li: ({ children: itemChildren }) => <li className="ml-4 pl-1">{itemChildren}</li>,
        ol: ({ children: listChildren }) => <ol className="my-2 list-decimal space-y-1">{listChildren}</ol>,
        p: ({ children: paragraphChildren }) => <p className="my-2 first:mt-0 last:mb-0">{paragraphChildren}</p>,
        strong: ({ children: strongChildren }) => <strong className="font-semibold text-foreground">{strongChildren}</strong>,
        ul: ({ children: listChildren }) => <ul className="my-2 list-disc space-y-1">{listChildren}</ul>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
