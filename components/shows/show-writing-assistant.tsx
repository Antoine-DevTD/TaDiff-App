"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BookOpenText, FileText, MessageCircleQuestion, RefreshCw, Send, Sparkles } from "lucide-react";
import {
  generateShowWritingDraftAction,
  loadShowWritingConversationAction,
  sendShowWritingMessageAction,
  startShowWritingConversationAction,
  type WritingConversation,
} from "@/app/(dashboard)/william/writing-actions";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { Button } from "@/components/ui/button";
import { extractPdfUrlText } from "@/lib/documents-detect";
import { cn } from "@/lib/utils";
import type { Show, ShowDocument } from "@/types";

export type ShowWritingObjective = "logline" | "synopsis" | "intention" | "email_pitch";

const objectives: Array<{ id: ShowWritingObjective; label: string; description: string }> = [
  { id: "logline", label: "Logline", description: "Trouver la phrase qui donne envie d'en savoir plus." },
  { id: "synopsis", label: "Synopsis", description: "Raconter clairement le parcours du spectacle." },
  { id: "intention", label: "Note d'intention", description: "Formuler la nécessité artistique du projet." },
  { id: "email_pitch", label: "Présentation diffusion", description: "Faire comprendre ce qui rend la proposition singulière." },
];

export function ShowWritingAssistant({
  documents,
  onApply,
  show,
}: {
  documents: ShowDocument[];
  onApply: (objective: ShowWritingObjective, value: string) => void;
  show: Show;
}) {
  const missingObjectives: ShowWritingObjective[] = [
    !show.logline ? "logline" : null,
    !show.synopsisText ? "synopsis" : null,
    !show.intentionNoteText ? "intention" : null,
    !show.emailPitch ? "email_pitch" : null,
  ].filter((value): value is ShowWritingObjective => value !== null);
  const firstMissing = missingObjectives[0] ?? "logline";
  const [objective, setObjective] = useState<ShowWritingObjective>(firstMissing);
  const [mode, setMode] = useState<"interview" | "documents">("interview");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [conversation, setConversation] = useState<WritingConversation | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [loading, startLoading] = useTransition();
  const readableDocuments = useMemo(() => documents.filter((document) => {
    const source = `${document.storagePath ?? ""} ${document.fileUrl}`.toLocaleLowerCase();
    return document.status === "Pret" && Boolean(document.previewUrl || document.fileUrl) && source.includes(".pdf");
  }), [documents]);

  useEffect(() => {
    startLoading(async () => {
      const result = await loadShowWritingConversationAction(show.id);
      if (result.ok) setConversation(result.conversation);
      else setError(result.message);
    });
  }, [show.id]);

  function startWorkshop() {
    setError(null);
    startLoading(async () => {
      const excerpts = [];
      if (mode === "documents") {
        for (const documentId of selectedDocuments) {
          const document = readableDocuments.find((item) => item.id === documentId);
          if (!document) continue;
          const text = await extractPdfUrlText(document.previewUrl || document.fileUrl);
          if (text) excerpts.push({ documentId: document.id, title: document.title, text });
        }
      }
      const result = await startShowWritingConversationAction({ showId: show.id, objective, mode, excerpts });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConversation(result.conversation);
      setMessage("");
    });
  }

  function sendMessage() {
    if (!conversation || message.trim().length < 2) return;
    const value = message.trim();
    setError(null);
    setMessage("");
    startLoading(async () => {
      const result = await sendShowWritingMessageAction({ conversationId: conversation.id, message: value });
      if (!result.ok) {
        setMessage(value);
        setError(result.message);
        return;
      }
      setConversation(result.conversation);
      setRemainingTokens(result.remainingTokens);
    });
  }

  function generateDraft() {
    if (!conversation) return;
    setError(null);
    startLoading(async () => {
      const result = await generateShowWritingDraftAction(conversation.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConversation(result.conversation);
      setRemainingTokens(result.remainingTokens);
    });
  }

  if (conversation) {
    const activeObjective = objectives.find((item) => item.id === conversation.objective) ?? objectives[0];
    return (
      <section className="overflow-hidden rounded-lg border border-accent/25 bg-panel" aria-labelledby="william-writing-title">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent-soft/20 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <TadiffMark className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <h3 id="william-writing-title" className="font-semibold">Atelier {activeObjective.label.toLocaleLowerCase("fr-FR")}</h3>
              <p className="text-xs text-muted">William garde le fil de cet échange pour ce spectacle.</p>
            </div>
          </div>
          <button className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground" type="button" onClick={() => setConversation(null)}>
            <RefreshCw className="h-4 w-4" /> Nouvel atelier
          </button>
        </header>

        <div className="max-h-[34rem] space-y-4 overflow-y-auto bg-panel-strong/25 p-4" aria-live="polite">
          {conversation.messages.map((item) => item.role === "user" ? (
            <p key={item.id} className="ml-auto max-w-[88%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-accent px-3.5 py-2.5 text-sm leading-6 text-white">{item.content}</p>
          ) : (
            <div key={item.id} className="flex items-start gap-2.5">
              <TadiffMark className="mt-0.5 h-7 w-7 shrink-0" />
              <div className="min-w-0 flex-1 rounded-lg rounded-tl-sm border border-border bg-panel px-3.5 py-3 text-sm leading-6">
                <p className="whitespace-pre-wrap">{item.content}</p>
                {item.isDraft ? (
                  <Button className="mt-3 min-h-9 px-3 py-1.5 text-sm" type="button" onClick={() => onApply(conversation.objective, item.content)}>
                    Utiliser ce brouillon
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {loading ? <p className="text-sm text-muted">William prépare la suite...</p> : null}
        </div>

        <div className="space-y-3 border-t border-border p-3">
          <textarea
            className="min-h-20 w-full resize-y rounded-md border border-border bg-panel px-3 py-2 text-sm leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
            placeholder="Répondez librement, même avec des notes courtes..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!loading) sendMessage();
              }
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button disabled={loading || message.trim().length < 2} type="button" onClick={sendMessage}>
                <Send className="mr-2 h-4 w-4" /> Envoyer
              </Button>
              <Button disabled={loading || conversation.messages.length < 2} type="button" variant="secondary" onClick={generateDraft}>
                <Sparkles className="mr-2 h-4 w-4" /> Proposer une version
              </Button>
            </div>
            {remainingTokens !== null ? <span className="text-xs text-muted">{new Intl.NumberFormat("fr-FR").format(remainingTokens)} crédits restants</span> : null}
          </div>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-accent/25 bg-accent-soft/10 p-4" aria-labelledby="william-writing-title">
      <div className="flex items-start gap-3">
        <TadiffMark className="h-10 w-10 shrink-0" />
        <div>
          <h3 id="william-writing-title" className="font-semibold">Écrire avec William</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {missingObjectives.length > 0
              ? `Il manque encore ${objectives.find((item) => item.id === firstMissing)?.label.toLocaleLowerCase("fr-FR")}. William peut vous aider à la rédiger.`
              : "Votre présentation est complète. William peut vous aider à retravailler un texte sans remplacer la version actuelle."}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">Il peut vous interroger ou partir uniquement des PDF que vous autorisez.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {objectives.map((item) => (
          <button
            key={item.id}
            className={cn("rounded-md border p-3 text-left transition", objective === item.id ? "border-accent bg-panel shadow-sm" : "border-border bg-panel/70 hover:border-accent/40")}
            type="button"
            onClick={() => setObjective(item.id)}
          >
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className={cn("flex items-start gap-3 rounded-md border p-3 text-left", mode === "interview" ? "border-accent bg-panel" : "border-border bg-panel/60")} type="button" onClick={() => setMode("interview")}>
          <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <span><span className="block text-sm font-semibold">Me poser des questions</span><span className="mt-1 block text-xs leading-5 text-muted">Idéal pour faire émerger les idées sans page blanche.</span></span>
        </button>
        <button className={cn("flex items-start gap-3 rounded-md border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50", mode === "documents" ? "border-accent bg-panel" : "border-border bg-panel/60")} disabled={readableDocuments.length === 0} type="button" onClick={() => setMode("documents")}>
          <BookOpenText className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <span><span className="block text-sm font-semibold">Lire les PDF choisis</span><span className="mt-1 block text-xs leading-5 text-muted">Le texte est envoyé à William seulement après votre validation.</span></span>
        </button>
      </div>

      {mode === "documents" ? (
        <fieldset className="mt-4 border-t border-border pt-4">
          <legend className="text-sm font-semibold">Documents autorisés</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {readableDocuments.map((document) => (
              <label key={document.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-panel px-3 py-2 text-sm">
                <input
                  checked={selectedDocuments.includes(document.id)}
                  className="h-4 w-4 accent-accent"
                  type="checkbox"
                  onChange={(event) => setSelectedDocuments((current) => event.target.checked ? [...current, document.id].slice(0, 4) : current.filter((id) => id !== document.id))}
                />
                <FileText className="h-4 w-4 shrink-0 text-muted" />
                <span className="truncate">{document.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Les propositions restent des brouillons jusqu&apos;à votre validation.</p>
        <Button disabled={loading || (mode === "documents" && selectedDocuments.length === 0)} type="button" onClick={startWorkshop}>
          <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Préparation..." : "Commencer l'atelier"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
