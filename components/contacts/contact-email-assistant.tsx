"use client";

import { Check, Copy, ExternalLink, Mail, Settings2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { RichEmailEditor } from "@/components/campaigns/rich-email-editor";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { builtInEmailTemplates } from "@/lib/email-template-presets";
import { renderTemplateDocument, renderTemplateText } from "@/lib/email-template-variables";
import type { Contact, EmailTemplate, Show } from "@/types";

export function ContactEmailAssistant({ contact, shows, templates, onClose, open }: {
  contact: Contact | null;
  shows: Show[];
  templates: EmailTemplate[];
  onClose: () => void;
  open: boolean;
}) {
  const choices = useMemo(() => [
    ...builtInEmailTemplates.map((template) => ({ ...template, custom: false })),
    ...templates.map((template) => ({ ...template, custom: true })),
  ], [templates]);
  const [templateId, setTemplateId] = useState(choices[0]?.id ?? "");
  const [showId, setShowId] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const selectedTemplate = choices.find((template) => template.id === templateId) ?? choices[0];
  const selectedShow = shows.find((show) => show.id === showId);
  const context = contact ? { contact, show: selectedShow } : null;
  const generatedSubject = context && selectedTemplate ? renderTemplateText(selectedTemplate.subjectTemplate, context) : "";
  const generatedBody = context && selectedTemplate ? renderTemplateDocument(selectedTemplate.bodyJson, context) : { type: "doc", content: [] };
  const editorKey = `${contact?.id ?? "none"}-${selectedShow?.id ?? "none"}-${selectedTemplate?.id ?? "none"}`;
  const resolvedSubject = subject || generatedSubject;

  if (!contact || !selectedTemplate || !context) return null;

  function changeContext(next: { showId?: string; templateId?: string }) {
    if (next.showId !== undefined) setShowId(next.showId);
    if (next.templateId !== undefined) setTemplateId(next.templateId);
    setSubject("");
    setMessage(null);
  }

  async function copyDraft() {
    try {
      const plain = `${resolvedSubject}\n\n${bodyText}`;
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([`<p><strong>${escapeHtml(resolvedSubject)}</strong></p>${bodyHtml}`], { type: "text/html" }),
        })]);
        setMessage("Brouillon copie avec sa mise en forme.");
      } else {
        await navigator.clipboard.writeText(plain);
        setMessage("Brouillon copie.");
      }
    } catch {
      setMessage("La copie est bloquee par ce navigateur.");
    }
  }

  function openMailer() {
    const to = contact?.email ? encodeURIComponent(contact.email) : "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(resolvedSubject)}&body=${encodeURIComponent(bodyText)}`;
  }

  const completedFields = selectedShow
    ? [selectedShow.logline, selectedShow.emailPitch, selectedShow.themes?.length, selectedShow.targetAudience].filter(Boolean).length
    : 0;

  return (
    <Dialog open={open} onClose={onClose} eyebrow="William" title={`Preparer un email pour ${contact.name}`} description="Choisissez le spectacle, puis adaptez le message avant de l'ouvrir dans votre messagerie." className="max-w-6xl">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-lg border border-border bg-panel-strong/55 p-4">
          <div className="flex items-center gap-3"><TadiffMark className="h-9 w-9" /><div><p className="text-sm font-semibold">William prepare le brouillon</p><p className="text-xs text-muted">Vous gardez la validation finale.</p></div></div>
          <label className="block text-sm font-medium">Spectacle<Select aria-label="Spectacle" className="mt-2" value={showId} onChange={(event) => changeContext({ showId: event.target.value })}><option value="">Message sans spectacle</option>{shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}</Select></label>
          <label className="block text-sm font-medium">Modele<Select aria-label="Modele d'email" className="mt-2" value={templateId} onChange={(event) => changeContext({ templateId: event.target.value })}>{choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}{choice.custom ? " - perso" : ""}</option>)}</Select></label>
          {selectedShow ? (
            <div className="rounded-md border border-border bg-panel p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Personnalisation</p><span className="text-xs font-semibold text-accent">{completedFields}/4</span></div>
              <div className="mt-3 space-y-2 text-xs text-muted">{[["Logline", selectedShow.logline], ["Presentation", selectedShow.emailPitch], ["Thematiques", selectedShow.themes?.length], ["Public", selectedShow.targetAudience]].map(([label, value]) => <p key={String(label)} className="flex items-center gap-2"><span className={`grid h-4 w-4 place-items-center rounded-full ${value ? "bg-success text-white" : "border border-border"}`}>{value ? <Check className="h-3 w-3" /> : null}</span>{label}</p>)}</div>
              <Link className="mt-3 inline-flex text-xs font-medium text-accent hover:underline" href={`/shows/${selectedShow.id}?tab=presentation`}>Completer la presentation</Link>
            </div>
          ) : <p className="border-l-2 border-accent/40 pl-3 text-xs leading-5 text-muted">Choisissez un spectacle pour integrer automatiquement son titre, sa presentation et ses thematiques.</p>}
          <Link className="inline-flex items-center text-xs font-medium text-muted hover:text-accent" href="/campaigns#modeles"><Settings2 className="mr-2 h-4 w-4" />Gerer les modeles</Link>
        </aside>

        <div className="min-w-0 space-y-4">
          <label className="block text-sm font-medium">Objet<Input key={`${editorKey}-subject`} className="mt-2" defaultValue={generatedSubject} onChange={(event) => setSubject(event.target.value)} /></label>
          <div><p className="mb-2 text-sm font-medium">Message</p><RichEmailEditor key={editorKey} content={generatedBody} onChange={(_, html, text) => { setBodyHtml(html); setBodyText(text); }} /></div>
          {message ? <p className="rounded-md bg-panel-strong px-3 py-2 text-sm text-muted" role="status">{message}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted">La mise en forme est conservee lors de la copie. L&apos;ouverture par email utilise une version texte compatible.</p>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={copyDraft}><Copy className="mr-2 h-4 w-4" />Copier avec mise en forme</Button><Button disabled={!contact.email || !bodyText} type="button" onClick={openMailer}><Mail className="mr-2 h-4 w-4" />Ouvrir ma messagerie</Button><Button aria-label="Ouvrir la page Emails" title="Ouvrir la page Emails" type="button" variant="ghost" onClick={() => { window.location.href = "/campaigns"; }}><ExternalLink className="h-4 w-4" /></Button></div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}
