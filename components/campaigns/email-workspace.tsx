"use client";

import { Copy, ExternalLink, Mail, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildContactEmailDraft,
  contactEmailTemplateOptions,
  type ContactEmailDraft,
  type ContactEmailTemplate,
} from "@/lib/email-templates";
import type { Contact, Show } from "@/types";

export function EmailWorkspace({ contacts, shows }: { contacts: Contact[]; shows: Show[] }) {
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [showId, setShowId] = useState("");
  const [template, setTemplate] = useState<ContactEmailTemplate>("first-touch");
  const selectedContact = contacts.find((contact) => contact.id === contactId) ?? null;
  const selectedShow = shows.find((show) => show.id === showId);
  const generated = useMemo(
    () => (selectedContact ? buildContactEmailDraft(selectedContact, template, selectedShow) : null),
    [selectedContact, selectedShow, template],
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Nouveau brouillon</p>
        <h2 className="mt-2 text-2xl font-semibold">Preparer un email maintenant</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Choisissez un contact et, si besoin, un spectacle. Aucun message ne part sans votre validation.
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-semibold">Ajoutez d&apos;abord un contact.</p>
          <p className="mt-2 text-sm text-muted">Un nom et une adresse email suffisent pour preparer un brouillon.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr]">
          <aside className="space-y-5 border-b border-border bg-panel-strong/45 p-5 lg:border-b-0 lg:border-r">
            <label className="block text-sm font-medium">
              Contact
              <Select
                aria-label="Contact"
                className="mt-2"
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
              >
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}{contact.organization ? ` - ${contact.organization}` : ""}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block text-sm font-medium">
              Spectacle facultatif
              <Select
                aria-label="Spectacle facultatif"
                className="mt-2"
                value={showId}
                onChange={(event) => setShowId(event.target.value)}
              >
                <option value="">Aucun spectacle rattache</option>
                {shows.map((show) => (
                  <option key={show.id} value={show.id}>{show.title}</option>
                ))}
              </Select>
            </label>

            <label className="block text-sm font-medium">
              Type de message
              <Select
                aria-label="Type de message"
                className="mt-2"
                value={template}
                onChange={(event) => setTemplate(event.target.value as ContactEmailTemplate)}
              >
                {contactEmailTemplateOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>

            {selectedContact && !selectedContact.email ? (
              <p className="rounded-md border border-warning/25 bg-warning/10 p-3 text-sm text-foreground">
                Ajoutez l&apos;adresse email de ce contact avant d&apos;ouvrir le brouillon.
              </p>
            ) : null}
          </aside>

          {selectedContact && generated ? (
            <EmailDraftEditor
              key={`${selectedContact.id}-${selectedShow?.id ?? "none"}-${template}`}
              contact={selectedContact}
              initialDraft={generated}
            />
          ) : null}
        </div>
      )}
    </Card>
  );
}

function EmailDraftEditor({ contact, initialDraft }: { contact: Contact; initialDraft: ContactEmailDraft }) {
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
        <Textarea
          className="mt-2 min-h-[300px] text-sm leading-6"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

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
