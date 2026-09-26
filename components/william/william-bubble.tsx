"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, CornerDownRight, Maximize2, MessageSquarePlus, Minimize2, Send, X } from "lucide-react";
import {
  loadWilliamChatAction,
  sendWilliamChatMessageAction,
  startNewWilliamChatAction,
} from "@/app/(dashboard)/william/assistant-action";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { cn } from "@/lib/utils";
import type { WilliamTip } from "@/lib/william";
import { getWilliamPageContext } from "@/lib/ai/conversation-suggestions";

const WilliamMarkdown = dynamic(
  () => import("@/components/william/william-markdown").then((module) => module.WilliamMarkdown),
  {
    loading: () => <span className="whitespace-pre-wrap">William prépare sa réponse...</span>,
    ssr: false,
  },
);

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
  suggestedQuestions: string[];
  sources?: Array<{ title: string; sourceUrl: string | null }>;
};

function TipLink({ tip, onSelect }: { tip: WilliamTip; onSelect: () => void }) {
  return (
    <Link className="flex min-h-11 items-start gap-2 rounded-md p-2 transition-colors hover:bg-panel-strong/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" href={tip.href} onClick={onSelect}>
      <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneDot[tip.tone])} />
      <span>
        <span className="block text-sm font-medium">{tip.title}</span>
        <span className="mt-0.5 block text-xs text-muted">{tip.detail}</span>
      </span>
    </Link>
  );
}

export function WilliamBubble({ aiEnabled, unavailableReason, tips, shows = [] }: { aiEnabled: boolean; unavailableReason?: string; tips: WilliamTip[]; shows?: Array<{ id: string; title: string }> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageContext = getWilliamPageContext(pathname, searchParams.get("tab"), shows);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [answerToReveal, setAnswerToReveal] = useState<{ id: string; text: string } | null>(null);
  const [asking, startAsking] = useTransition();
  const [loadingChat, startLoadingChat] = useTransition();
  const [resettingChat, startResettingChat] = useTransition();
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const chatLoadedRef = useRef(false);
  const messageSequenceRef = useRef(0);
  const urgentCount = tips.filter((tip) => tip.tone === "danger" || tip.tone === "warning").length;
  const priorityTip = tips[0];
  const otherTips = tips.slice(1);
  const revealing = Boolean(answerToReveal);

  const suggestedQuestions = [
    ...pageContext.questions,
  ];

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
    window.addEventListener("keydown", closeOnEscape);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function closePanel() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function prepareQuestion(value: string) {
    setQuestion(value);
    questionRef.current?.focus();
  }

  useEffect(() => {
    if (!open || !aiEnabled || chatLoadedRef.current) return;
    chatLoadedRef.current = true;
    startLoadingChat(async () => {
      try {
        const result = await loadWilliamChatAction();
        if (!result.ok) {
          setAnswerError(result.message);
          chatLoadedRef.current = false;
          return;
        }
        setAnswerError(null);
        setSessionId(result.conversation.sessionId);
        setMessages(result.conversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          text: message.text,
          suggestedQuestions: message.suggestedQuestions,
          sources: message.sources,
        })));
      } catch {
        setAnswerError("La conversation n’a pas pu être chargée. Vérifiez votre connexion, puis rouvrez William pour réessayer.");
        chatLoadedRef.current = false;
      }
    });
  }, [aiEnabled, open]);

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
    conversationEndRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [answerError, asking, messages]);

  function askQuestion(nextQuestion: string) {
    const value = nextQuestion.trim();
    if (!aiEnabled || value.length < 3 || asking || revealing || loadingChat || resettingChat) return;
    messageSequenceRef.current += 1;
    const userMessage: ChatMessage = {
      id: `user-${messageSequenceRef.current}`,
      role: "user",
      text: value,
      suggestedQuestions: [],
    };
    setMessages((current) => [...current, userMessage]);
    setAnswerError(null);
    setQuestion("");
    startAsking(async () => {
      function restoreQuestion(message: string) {
        setAnswerError(message);
        setQuestion((current) => current || value);
        setMessages((current) => current.filter((item) => item.id !== userMessage.id));
      }
      try {
        const result = await sendWilliamChatMessageAction({ question: value, sessionId, pageContext: { label: pageContext.label, route: pageContext.route } });
        if (!result.ok) {
          restoreQuestion(result.message);
          return;
        }
        setSessionId(result.sessionId);
        setRemainingTokens(result.answer.remainingTokens);
        const answerId = result.answer.messageId;
        const assistantMessage = {
          id: answerId,
          role: "assistant" as const,
          suggestedQuestions: result.answer.suggestedQuestions,
          sources: result.answer.sources,
        };
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setMessages((current) => [...current, { ...assistantMessage, text: result.answer.text }]);
        } else {
          setMessages((current) => [...current, { ...assistantMessage, text: "" }]);
          setAnswerToReveal({ id: answerId, text: result.answer.text });
        }
      } catch {
        restoreQuestion("La connexion à William a été interrompue. Votre question est conservée. Réessayez.");
      }
    });
  }

  function startNewConversation() {
    if (asking || revealing || loadingChat || resettingChat) return;
    setAnswerError(null);
    startResettingChat(async () => {
      try {
        const result = await startNewWilliamChatAction(sessionId);
        if (!result.ok) {
          setAnswerError(result.message);
          return;
        }
        setSessionId(null);
        setMessages([]);
        setQuestion("");
        setRemainingTokens(null);
        setAnswerToReveal(null);
      } catch {
        setAnswerError("Impossible de démarrer une nouvelle conversation. Votre échange est conservé. Réessayez.");
      }
    });
  }

  function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askQuestion(question);
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-3 lg:bottom-5 lg:right-5 print:hidden">
      {open ? (
        <div
          id="william-panel"
          ref={panelRef}
          tabIndex={-1}
          aria-label="Assistant William"
          role="region"
          className={cn(
            "pointer-events-auto william-panel-enter fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] top-3 flex min-h-0 overflow-hidden rounded-lg border border-border bg-panel shadow-xl shadow-ink/20 outline-none focus-visible:ring-2 focus-visible:ring-accent lg:static lg:transition-[width,height] lg:duration-300 motion-reduce:transition-none",
            expanded
              ? "lg:h-[min(48rem,calc(100dvh-7rem))] lg:w-[min(58rem,calc(100vw-2rem))]"
              : "lg:h-[min(40rem,calc(100dvh-7rem))] lg:w-[26rem] lg:max-w-[calc(100vw-2rem)]",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-border bg-ink px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <TadiffMark className="h-9 w-9 shrink-0 ring-1 ring-white/20" />
                <div className="min-w-0">
                  <p className="font-semibold">William</p>
                  <p className="truncate text-xs text-white/75">Assistant IA · {pageContext.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {aiEnabled && (sessionId || messages.length > 0) ? (
                  <button
                    aria-label="Nouvelle conversation"
                    className="grid h-11 w-11 place-items-center rounded-md transition hover:bg-white/10 disabled:opacity-40"
                    disabled={asking || revealing || loadingChat || resettingChat}
                    title="Nouvelle conversation"
                    type="button"
                    onClick={startNewConversation}
                  >
                    <MessageSquarePlus aria-hidden="true" className="h-5 w-5" />
                  </button>
                ) : null}
                <button aria-label={expanded ? "Réduire William" : "Agrandir William"} className="hidden h-11 w-11 place-items-center rounded-md transition hover:bg-white/10 lg:grid" title={expanded ? "Réduire" : "Agrandir"} type="button" onClick={() => setExpanded((value) => !value)}>
                  {expanded ? <Minimize2 aria-hidden="true" className="h-5 w-5" /> : <Maximize2 aria-hidden="true" className="h-5 w-5" />}
                </button>
                <button aria-label="Fermer William" className="grid h-11 w-11 place-items-center rounded-md transition hover:bg-white/10" title="Fermer" type="button" onClick={closePanel}>
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </header>

            {aiEnabled ? <details className="shrink-0 border-b border-border px-4 py-2 text-xs">
              <summary className="cursor-pointer py-1 font-medium text-accent">Contexte utilisé · {pageContext.label}</summary>
              <div className="max-h-32 space-y-2 overflow-y-auto py-2 leading-5 text-muted">
                <p>Votre question, l’historique récent et les informations enregistrées pour votre compagnie peuvent être utilisés : spectacles, actions, diffusion, dossiers et trésorerie.</p>
                <p>Les données absentes, les événements non saisis et le solde bancaire en temps réel ne sont pas connus. Les sources documentaires disponibles sont indiquées sous la réponse ; la présence d’une pièce ne garantit pas la lecture de son contenu.</p>
                <p>William prépare une réponse ou un brouillon. Vous vérifiez les faits et validez toute action dans l’outil concerné. Aucun email n’est envoyé depuis cette conversation.</p>
              </div>
            </details> : null}

            {aiEnabled ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-panel-strong/35 px-4 py-5" aria-live="polite" aria-busy={asking || revealing || loadingChat}>
                  {loadingChat ? (
                    <div className="flex h-full min-h-32 items-center justify-center gap-2 text-sm text-muted">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
                      William retrouve votre conversation...
                    </div>
                  ) : messages.length === 0 && !asking ? (
                    <div className="mx-auto max-w-lg py-3">
                      <div className="flex items-center gap-3">
                        <TadiffMark className="h-10 w-10 shrink-0" />
                        <div><p className="font-semibold">Que voulez-vous faire avancer ?</p><p className="mt-1 text-sm leading-6 text-muted">Préparez votre demande pour {pageContext.label.toLocaleLowerCase("fr-FR")}, puis envoyez-la à William.</p></div>
                      </div>
                      <div className="mt-5">
                        <p className="text-xs text-muted">Vous pouvez par exemple demander :</p>
                        <div className="mt-2 flex flex-col items-start gap-1">
                        {suggestedQuestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            className="min-h-10 max-w-full py-2 text-left text-sm italic leading-5 text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-accent hover:decoration-accent/35 focus-visible:rounded-sm focus-visible:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                            disabled={asking || revealing || loadingChat || resettingChat}
                            type="button"
                            onClick={() => prepareQuestion(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                        </div>
                      </div>
                      {answerError ? <p className="mt-4 rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{answerError}</p> : null}
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
                            {message.sources ? <div className="mt-3 border-t border-border pt-2 text-xs text-muted">
                              <p className="font-medium">Sources documentaires</p>
                              {message.sources.length ? <ul className="mt-1 space-y-1">{message.sources.map((source, index) => <li key={`${source.title}-${index}`}>{source.sourceUrl && /^https?:\/\//i.test(source.sourceUrl) ? <a className="text-accent underline" href={source.sourceUrl} target="_blank" rel="noreferrer">{source.title}</a> : source.title}</li>)}</ul> : <p>Aucune source documentaire jointe à cette réponse. Vérifiez les faits avec vos informations de compagnie.</p>}
                            </div> : null}
                            {revealing && messages.at(-1)?.id === message.id ? <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent motion-reduce:animate-none" /> : null}
                            {message.suggestedQuestions.length > 0 && !(revealing && messages.at(-1)?.id === message.id) ? (
                              <div className="mt-3 border-t border-border pt-2">
                                {message.suggestedQuestions.map((suggestion) => (
                                  <button
                                    key={suggestion}
                                    className="group flex min-h-9 w-full items-start gap-2 rounded-md px-1.5 py-2 text-left text-xs font-medium leading-5 text-accent transition-colors hover:bg-accent/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
                                    disabled={asking || revealing || resettingChat}
                                    type="button"
                                    onClick={() => prepareQuestion(suggestion)}
                                  >
                                    <CornerDownRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                                    <span className="underline decoration-accent/25 underline-offset-4 group-hover:decoration-accent">{suggestion}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {asking ? (
                        <div className="flex items-start gap-2.5">
                          <TadiffMark className="h-7 w-7 shrink-0" />
                          <div className="flex h-10 items-center gap-1 rounded-lg rounded-tl-sm border border-border bg-panel px-4" aria-label="William prépare sa réponse">
                            {[0, 1, 2].map((dot) => <span key={dot} className="william-thinking-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: `${dot * 120}ms` }} />)}
                          </div>
                        </div>
                      ) : null}
                      {answerError ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{answerError}</p> : null}
                      <div ref={conversationEndRef} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mb-5 space-y-2 text-sm leading-6" id="william-unavailable" role="status">
                  <p className="font-semibold">La conversation est indisponible</p>
                  <p className="text-muted">{unavailableReason || "William n’est pas activé pour ce compte actuellement. Contactez l’équipe TaDiff pour vérifier cet accès."}</p>
                  <Link className="inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4" href="/settings" onClick={closePanel}>Consulter mon accès dans les paramètres</Link>
                </div>
                <p className="text-xs font-semibold uppercase text-muted">Points d’attention disponibles</p>
                {priorityTip ? <TipLink tip={priorityTip} onSelect={closePanel} /> : <p className="mt-3 text-sm text-muted">Aucun point d’attention dans les informations disponibles.</p>}
                {otherTips.length > 0 ? (
                  <details className="group mt-3 border-t border-border pt-3">
                    <summary className="cursor-pointer list-none text-sm font-medium"><span className="flex items-center justify-between gap-3">{otherTips.length} autre{otherTips.length > 1 ? "s" : ""} point{otherTips.length > 1 ? "s" : ""}<ChevronDown aria-hidden="true" className="h-4 w-4 text-muted transition group-open:rotate-180" /></span></summary>
                    <div className="mt-2 space-y-1">{otherTips.map((tip) => <TipLink key={tip.id} tip={tip} onSelect={closePanel} />)}</div>
                  </details>
                ) : null}
              </div>
            )}
                <form className="shrink-0 border-t border-border bg-panel p-3" onSubmit={submitQuestion}>
                  <label className="mb-2 block text-sm font-medium" htmlFor="william-question">Votre question</label>
                  <div className="flex items-end gap-2 rounded-lg border border-border bg-panel px-3 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
                    <textarea
                      ref={questionRef}
                      id="william-question"
                      aria-describedby={aiEnabled ? "william-question-help" : "william-unavailable william-question-help"}
                      className="max-h-36 min-h-12 min-w-0 flex-1 resize-none bg-transparent py-2 text-base leading-5 outline-none lg:text-sm"
                      maxLength={4000}
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
                    <button aria-label="Envoyer à William" className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-white transition hover:bg-accent-strong disabled:opacity-40" disabled={!aiEnabled || asking || revealing || loadingChat || resettingChat || question.trim().length < 3} title={aiEnabled ? "Envoyer" : "La conversation est indisponible"} type="submit"><Send className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-muted">
                    <span id="william-question-help">{aiEnabled ? "Entrée pour envoyer · Maj + Entrée pour une ligne" : "Vous pouvez préparer votre question. L’envoi sera possible quand l’accès sera rétabli."}</span>
                    {remainingTokens !== null ? <span className="shrink-0">{new Intl.NumberFormat("fr-FR").format(remainingTokens)} crédits</span> : null}
                  </div>
                </form>
          </div>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        aria-controls="william-panel"
        aria-expanded={open}
        aria-label={open ? "Fermer William" : "Ouvrir William"}
        className={cn("pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent lg:h-14 lg:w-14", open && "invisible lg:visible")}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <TadiffMark className="h-10 w-10 shadow-sm ring-1 ring-white/25" />
        {!open && urgentCount > 0 ? <span aria-label={`${urgentCount} priorité${urgentCount > 1 ? "s" : ""}`} className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white ring-2 ring-panel">{urgentCount}</span> : null}
      </button>
    </div>
  );
}
