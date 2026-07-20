"use client";

import { Copy, Download, ExternalLink, Mail, Paperclip, Send } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { RichEmailEditor } from "@/components/campaigns/rich-email-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createZip, fetchDocument, sanitizeFilename, type ZipEntry } from "@/components/grants/grant-dossier-zip-button";
import { builtInEmailTemplates } from "@/lib/email-template-presets";
import { paragraph, renderTemplateDocument, renderTemplateText } from "@/lib/email-template-variables";
import { getShowDocumentTypeLabel } from "@/lib/show-documents";
import type { Contact, EmailTemplate, Show, ShowDocument, ShowDocumentType } from "@/types";
import type { Json } from "@/types/database.types";

const emailAttachmentTypes: ShowDocumentType[] = ["Dossier artistique", "Fiche technique", "Texte", "Note d'intention", "Synopsis", "Budget", "Devis", "Affiche"];

export function EmailWorkspace({ contacts, documents, shows, templates }: { contacts: Contact[]; documents: ShowDocument[]; shows: Show[]; templates: EmailTemplate[] }) {
  const choices = useMemo(() => [...builtInEmailTemplates.map((template) => ({ ...template, custom: false })), ...templates.map((template) => ({ ...template, custom: true }))], [templates]);
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [showId, setShowId] = useState("");
  const [templateId, setTemplateId] = useState(choices[0]?.id ?? "");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const selectedContact = contacts.find((contact) => contact.id === contactId) ?? null;
  const selectedShow = shows.find((show) => show.id === showId);
  const selectedTemplate = choices.find((template) => template.id === templateId) ?? choices[0];
  const showDocuments = useMemo(() => documents.filter((document) => document.showId === showId), [documents, showId]);
  const attachmentSlots = useMemo(() => emailAttachmentTypes.map((type) => ({ type, document: showDocuments.find((document) => document.documentType === type) })), [showDocuments]);
  const selectedDocuments = showDocuments.filter((document) => selectedDocumentIds.includes(document.id));
  const generated = useMemo(() => {
    if (!selectedContact || !selectedTemplate) return null;
    const context = { contact: selectedContact, show: selectedShow };
    let body = renderTemplateDocument(selectedTemplate.bodyJson, context);
    if (selectedDocuments.length > 0) {
      const labels = selectedDocuments.map((document) => getShowDocumentTypeLabel(document.documentType).toLocaleLowerCase("fr-FR"));
      body = appendParagraph(body, `Vous trouverez egalement en pieces jointes : ${labels.join(", ")}.`);
    }
    return { subject: renderTemplateText(selectedTemplate.subjectTemplate, context), body };
  }, [selectedContact, selectedDocuments, selectedShow, selectedTemplate]);

  function selectShow(value: string) { setShowId(value); setSelectedDocumentIds([]); }
  function toggleDocument(documentId: string) { setSelectedDocumentIds((current) => current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]); }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Nouveau brouillon</p><h2 className="mt-2 text-2xl font-semibold">Preparer un email maintenant</h2><p className="mt-2 max-w-2xl text-sm text-muted">Choisissez un contact, un spectacle et un modele. Aucun email ne part sans votre validation.</p></div>
      {contacts.length === 0 ? <div className="p-8 text-center"><p className="font-semibold">Ajoutez d&apos;abord un contact.</p><p className="mt-2 text-sm text-muted">Un nom et une adresse email suffisent pour preparer un brouillon.</p></div> : (
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5 border-b border-border bg-panel-strong/45 p-5 lg:border-b-0 lg:border-r">
            <label className="block text-sm font-medium">Contact<Select aria-label="Contact" className="mt-2" value={contactId} onChange={(event) => setContactId(event.target.value)}>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.organization ? ` - ${contact.organization}` : ""}</option>)}</Select></label>
            <label className="block text-sm font-medium">Spectacle<Select aria-label="Spectacle" className="mt-2" value={showId} onChange={(event) => selectShow(event.target.value)}><option value="">Message sans spectacle</option>{shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}</Select></label>
            <label className="block text-sm font-medium">Modele<Select aria-label="Modele d'email" className="mt-2" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}{choice.custom ? " - perso" : ""}</option>)}</Select></label>
            {selectedShow ? <fieldset className="border-t border-border pt-5"><legend className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />Pieces a joindre</legend><p className="mt-2 text-xs leading-5 text-muted">Cochez les fichiers a telecharger avant d&apos;ouvrir votre messagerie.</p><div className="mt-3 space-y-1">{attachmentSlots.map(({ document, type }) => { const available = Boolean(document?.fileUrl); return <label key={type} className={`flex min-h-10 items-center gap-3 rounded-md px-2 py-2 text-sm ${available ? "cursor-pointer hover:bg-panel" : "cursor-not-allowed opacity-45"}`}><input checked={Boolean(document && selectedDocumentIds.includes(document.id))} className="h-4 w-4 accent-[var(--color-accent)]" disabled={!available} type="checkbox" onChange={() => document && toggleDocument(document.id)} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{getShowDocumentTypeLabel(type)}</span><span className="block text-xs text-muted">{!available ? "Non disponible" : document?.status === "Pret" ? "Pret" : "A verifier"}</span></span></label>; })}</div></fieldset> : null}
            {selectedShow && !selectedShow.logline ? <a className="block border-l-2 border-accent/40 pl-3 text-xs leading-5 text-muted hover:text-accent" href={`/shows/${selectedShow.id}?tab=presentation`}>Ajoutez une logline et des thematiques pour obtenir un message plus personnel.</a> : null}
            {selectedContact && !selectedContact.email ? <p className="rounded-md border border-warning/25 bg-warning/10 p-3 text-sm">Ajoutez l&apos;adresse email de ce contact avant d&apos;ouvrir le brouillon.</p> : null}
          </aside>
          {selectedContact && generated ? <EmailDraftEditor key={`${selectedContact.id}-${selectedShow?.id ?? "none"}-${templateId}-${[...selectedDocumentIds].sort().join("-")}`} contact={selectedContact} initialSubject={generated.subject} initialBody={generated.body} selectedDocuments={selectedDocuments} showTitle={selectedShow?.title ?? "spectacle"} /> : null}
        </div>
      )}
    </Card>
  );
}

function EmailDraftEditor({ contact, initialSubject, initialBody, selectedDocuments, showTitle }: { contact: Contact; initialSubject: string; initialBody: Json; selectedDocuments: ShowDocument[]; showTitle: string }) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const canOpen = Boolean(contact.email && subject.trim() && body.trim());
  function encodedDraft() { return { to: encodeURIComponent(contact.email), subject: encodeURIComponent(subject), body: encodeURIComponent(body) }; }
  async function copyDraft() { try { const plain = `${subject}\n\n${body}`; if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([plain], { type: "text/plain" }), "text/html": new Blob([`<p><strong>${escapeHtml(subject)}</strong></p>${bodyHtml}`], { type: "text/html" }) })]); else await navigator.clipboard.writeText(plain); setMessage("Brouillon copie avec sa mise en forme."); } catch { setMessage("La copie est bloquee par ce navigateur."); } }
  function openDefaultMailer() { if (!canOpen) return; const draft = encodedDraft(); window.location.href = `mailto:${draft.to}?subject=${draft.subject}&body=${draft.body}`; }
  function openWebMailer(provider: "gmail" | "outlook") { if (!canOpen) return; const draft = encodedDraft(); const url = provider === "gmail" ? `https://mail.google.com/mail/?view=cm&fs=1&to=${draft.to}&su=${draft.subject}&body=${draft.body}` : `https://outlook.office.com/mail/deeplink/compose?to=${draft.to}&subject=${draft.subject}&body=${draft.body}`; window.open(url, "_blank", "noopener,noreferrer"); }
  return <div className="min-w-0 space-y-4 p-5"><label className="block text-sm font-medium">Destinataire<Input className="mt-2" type="email" value={contact.email} readOnly /></label><label className="block text-sm font-medium">Objet<Input className="mt-2" value={subject} onChange={(event) => setSubject(event.target.value)} /></label><div><p className="mb-2 text-sm font-medium">Message</p><RichEmailEditor content={initialBody} onChange={(_, html, text) => { setBodyHtml(html); setBody(text); }} /></div>{selectedDocuments.length > 0 ? <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{selectedDocuments.length} piece(s) preparee(s)</p><p className="mt-1 text-xs text-muted">Telechargez-les, puis ajoutez le ZIP dans votre brouillon Gmail ou Outlook.</p></div><DownloadAttachmentsButton documents={selectedDocuments} showTitle={showTitle} /></div> : null}{message ? <p className="text-sm text-muted" role="status">{message}</p> : null}<div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button type="button" variant="secondary" onClick={copyDraft}><Copy className="mr-2 h-4 w-4" />Copier avec mise en forme</Button><Button disabled={!canOpen} type="button" onClick={openDefaultMailer}><Mail className="mr-2 h-4 w-4" />Ouvrir ma messagerie</Button><Button disabled={!canOpen} type="button" variant="secondary" onClick={() => openWebMailer("gmail")}><Send className="mr-2 h-4 w-4" />Gmail</Button><Button disabled={!canOpen} type="button" variant="secondary" onClick={() => openWebMailer("outlook")}><ExternalLink className="mr-2 h-4 w-4" />Outlook</Button></div></div>;
}

function DownloadAttachmentsButton({ documents, showTitle }: { documents: ShowDocument[]; showTitle: string }) { const [isPending, startTransition] = useTransition(); function download() { startTransition(async () => { const entries: ZipEntry[] = []; for (const document of documents) { const fetched = await fetchDocument(document.fileUrl); if (fetched) entries.push({ name: `${sanitizeFilename(getShowDocumentTypeLabel(document.documentType))}${fetched.extension}`, data: fetched.data }); } if (entries.length === 0) return; const url = URL.createObjectURL(createZip(entries)); const link = document.createElement("a"); link.href = url; link.download = `${sanitizeFilename(showTitle)}-pieces-email.zip`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }); } return <Button disabled={isPending} type="button" variant="secondary" onClick={download}><Download className="mr-2 h-4 w-4" />{isPending ? "Preparation..." : "Telecharger les pieces"}</Button>; }

function appendParagraph(document: Json, text: string): Json { if (!document || typeof document !== "object" || Array.isArray(document)) return document; return { ...document, content: [...(Array.isArray(document.content) ? document.content : []), paragraph(text)] }; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character); }
