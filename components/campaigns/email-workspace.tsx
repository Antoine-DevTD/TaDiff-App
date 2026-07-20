"use client";

import { Copy, Download, ExternalLink, Mail, Paperclip, Send } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createZip,
  fetchDocument,
  sanitizeFilename,
  type ZipEntry,
} from "@/components/grants/grant-dossier-zip-button";
import {
  buildContactEmailDraft,
  contactEmailTemplateOptions,
  type ContactEmailDraft,
  type ContactEmailTemplate,
} from "@/lib/email-templates";
import { getShowDocumentTypeLabel } from "@/lib/show-documents";
import type { Contact, Show, ShowDocument, ShowDocumentType } from "@/types";

const emailAttachmentTypes: ShowDocumentType[] = [
  "Dossier artistique",
  "Fiche technique",
  "Texte",
  "Note d'intention",
  "Synopsis",
  "Budget",
  "Devis",
  "Affiche",
];

type EmailWorkspaceProps = {
  contacts: Contact[];
  documents: ShowDocument[];
  shows: Show[];
};

export function EmailWorkspace({ contacts, documents, shows }: EmailWorkspaceProps) {
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [showId, setShowId] = useState("");
  const [template, setTemplate] = useState<ContactEmailTemplate>("first-touch");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const selectedContact = contacts.find((contact) => contact.id === contactId) ?? null;
  const selectedShow = shows.find((show) => show.id === showId);
  const showDocuments = useMemo(
    () => documents.filter((document) => document.showId === showId),
    [documents, showId],
  );
  const attachmentSlots = useMemo(
    () => emailAttachmentTypes.map((type) => ({
      type,
      document: showDocuments.find((document) => document.documentType === type),
    })),
    [showDocuments],
  );
  const selectedDocuments = showDocuments.filter((document) => selectedDocumentIds.includes(document.id));
  const generated = useMemo(
    () => selectedContact
      ? buildContactEmailDraft(selectedContact, template, selectedShow, {
          attachmentTypes: selectedDocuments.map((document) => document.documentType),
        })
      : null,
    [selectedContact, selectedDocuments, selectedShow, template],
  );

  function selectShow(value: string) {
    setShowId(value);
    setSelectedDocumentIds([]);
  }

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Nouveau brouillon</p>
        <h2 className="mt-2 text-2xl font-semibold">Preparer un email maintenant</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Choisissez un contact et un spectacle. Le message reste modifiable et aucun email ne part sans votre validation.
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-semibold">Ajoutez d&apos;abord un contact.</p>
          <p className="mt-2 text-sm text-muted">Un nom et une adresse email suffisent pour preparer un brouillon.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5 border-b border-border bg-panel-strong/45 p-5 lg:border-b-0 lg:border-r">
            <label className="block text-sm font-medium">
              Contact
              <Select aria-label="Contact" className="mt-2" value={contactId} onChange={(event) => setContactId(event.target.value)}>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}{contact.organization ? ` - ${contact.organization}` : ""}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block text-sm font-medium">
              Spectacle facultatif
              <Select aria-label="Spectacle facultatif" className="mt-2" value={showId} onChange={(event) => selectShow(event.target.value)}>
                <option value="">Aucun spectacle rattache</option>
                {shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}
              </Select>
            </label>

            <label className="block text-sm font-medium">
              Type de message
              <Select aria-label="Type de message" className="mt-2" value={template} onChange={(event) => setTemplate(event.target.value as ContactEmailTemplate)}>
                {contactEmailTemplateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </label>

            {selectedShow ? (
              <fieldset className="border-t border-border pt-5">
                <legend className="flex items-center gap-2 text-sm font-semibold">
                  <Paperclip aria-hidden="true" className="h-4 w-4" />
                  Pieces a joindre
                </legend>
                <p className="mt-2 text-xs leading-5 text-muted">Cochez les fichiers a telecharger avant d&apos;ouvrir votre messagerie.</p>
                <div className="mt-3 space-y-1">
                  {attachmentSlots.map(({ document, type }) => {
                    const available = Boolean(document?.fileUrl);
                    return (
                      <label
                        key={type}
                        className={`flex min-h-10 items-center gap-3 rounded-md px-2 py-2 text-sm ${available ? "cursor-pointer hover:bg-panel" : "cursor-not-allowed opacity-45"}`}
                      >
                        <input
                          checked={Boolean(document && selectedDocumentIds.includes(document.id))}
                          className="h-4 w-4 accent-[var(--color-accent)]"
                          disabled={!available}
                          type="checkbox"
                          onChange={() => document && toggleDocument(document.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{getShowDocumentTypeLabel(type)}</span>
                          <span className="block text-xs text-muted">
                            {!available ? "Non disponible" : document?.status === "Pret" ? "Pret" : "A verifier"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {selectedShow && !selectedShow.logline ? (
              <a className="block border-l-2 border-accent/40 pl-3 text-xs leading-5 text-muted hover:text-accent" href={`/shows/${selectedShow.id}?tab=presentation`}>
                Ajoutez une logline et des thematiques pour obtenir un message plus personnel.
              </a>
            ) : null}

            {selectedContact && !selectedContact.email ? (
              <p className="rounded-md border border-warning/25 bg-warning/10 p-3 text-sm text-foreground">
                Ajoutez l&apos;adresse email de ce contact avant d&apos;ouvrir le brouillon.
              </p>
            ) : null}
          </aside>

          {selectedContact && generated ? (
            <EmailDraftEditor
              key={`${selectedContact.id}-${selectedShow?.id ?? "none"}-${template}-${[...selectedDocumentIds].sort().join("-")}`}
              contact={selectedContact}
              initialDraft={generated}
              selectedDocuments={selectedDocuments}
              showTitle={selectedShow?.title ?? "spectacle"}
            />
          ) : null}
        </div>
      )}
    </Card>
  );
}

function EmailDraftEditor({
  contact,
  initialDraft,
  selectedDocuments,
  showTitle,
}: {
  contact: Contact;
  initialDraft: ContactEmailDraft;
  selectedDocuments: ShowDocument[];
  showTitle: string;
}) {
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [message, setMessage] = useState<string | null>(null);
  const canOpen = Boolean(contact.email && subject.trim() && body.trim());

  function encodedDraft() {
    return {
      to: encodeURIComponent(contact.email),
      subject: encodeURIComponent(subject),
      body: encodeURIComponent(body),
    };
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setMessage("Brouillon copie.");
    } catch {
      setMessage("La copie est bloquee par ce navigateur.");
    }
  }

  function openDefaultMailer() {
    if (!canOpen) return;
    const draft = encodedDraft();
    window.location.href = `mailto:${draft.to}?subject=${draft.subject}&body=${draft.body}`;
  }

  function openWebMailer(provider: "gmail" | "outlook") {
    if (!canOpen) return;
    const draft = encodedDraft();
    const url = provider === "gmail"
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${draft.to}&su=${draft.subject}&body=${draft.body}`
      : `https://outlook.office.com/mail/deeplink/compose?to=${draft.to}&subject=${draft.subject}&body=${draft.body}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4 p-5">
      <label className="block text-sm font-medium">
        Destinataire
        <Input className="mt-2" type="email" value={contact.email} readOnly />
      </label>
      <label className="block text-sm font-medium">
        Objet
        <Input className="mt-2" value={subject} onChange={(event) => setSubject(event.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        Message
        <Textarea className="mt-2 min-h-[380px] text-sm leading-6" value={body} onChange={(event) => setBody(event.target.value)} />
      </label>

      {selectedDocuments.length > 0 ? (
        <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{selectedDocuments.length} piece(s) preparee(s)</p>
            <p className="mt-1 text-xs text-muted">Telechargez-les, puis ajoutez le ZIP dans votre brouillon Gmail ou Outlook.</p>
          </div>
          <DownloadAttachmentsButton documents={selectedDocuments} showTitle={showTitle} />
        </div>
      ) : null}

      {message ? <p className="text-sm text-muted" role="status">{message}</p> : null}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={copyDraft}>
          <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
          Copier
        </Button>
        <Button disabled={!canOpen} type="button" onClick={openDefaultMailer}>
          <Mail aria-hidden="true" className="mr-2 h-4 w-4" />
          Ouvrir ma messagerie
        </Button>
        <Button disabled={!canOpen} type="button" variant="secondary" onClick={() => openWebMailer("gmail")}>
          <Send aria-hidden="true" className="mr-2 h-4 w-4" />
          Gmail
        </Button>
        <Button disabled={!canOpen} type="button" variant="secondary" onClick={() => openWebMailer("outlook")}>
          <ExternalLink aria-hidden="true" className="mr-2 h-4 w-4" />
          Outlook
        </Button>
      </div>
    </div>
  );
}

function DownloadAttachmentsButton({ documents, showTitle }: { documents: ShowDocument[]; showTitle: string }) {
  const [isPending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const entries: ZipEntry[] = [];

      for (const document of documents) {
        const fetched = await fetchDocument(document.fileUrl);
        if (fetched) {
          entries.push({
            name: `${sanitizeFilename(getShowDocumentTypeLabel(document.documentType))}${fetched.extension}`,
            data: fetched.data,
          });
        }
      }

      if (entries.length === 0) return;
      const url = URL.createObjectURL(createZip(entries));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFilename(showTitle)}-pieces-email.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button disabled={isPending} type="button" variant="secondary" onClick={download}>
      <Download aria-hidden="true" className="mr-2 h-4 w-4" />
      {isPending ? "Preparation..." : "Telecharger les pieces"}
    </Button>
  );
}
