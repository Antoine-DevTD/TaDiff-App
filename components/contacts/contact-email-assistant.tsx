"use client";

import { Copy, Mail, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildContactEmailDraft,
  contactEmailTemplateOptions,
  type ContactEmailTemplate,
} from "@/lib/email-templates";
import type { Contact } from "@/types";

export function ContactEmailAssistant({
  contact,
  onClose,
  open,
}: {
  contact: Contact | null;
  onClose: () => void;
  open: boolean;
}) {
  const [template, setTemplate] = useState<ContactEmailTemplate>("first-touch");
  const [message, setMessage] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const generated = useMemo(() => {
    if (!contact) return null;
    return buildContactEmailDraft(contact, template);
  }, [contact, template]);

  if (!contact || !generated) return null;

  function currentSubject() {
    return subjectRef.current?.value ?? generated?.subject ?? "";
  }

  function currentBody() {
    return bodyRef.current?.value ?? generated?.body ?? "";
  }

  async function copyDraft() {
    const draft = `${currentSubject()}\n\n${currentBody()}`;

    try {
      await navigator.clipboard.writeText(draft);
      setMessage("Brouillon copie. Vous pouvez le coller dans Gmail, Outlook ou votre SMTP.");
    } catch {
      setMessage("Copie impossible dans ce navigateur. Selectionnez le texte manuellement.");
    }
  }

  function openMailer() {
    const to = contact?.email ? encodeURIComponent(contact.email) : "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(currentSubject())}&body=${encodeURIComponent(currentBody())}`;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="William"
      title={`Preparer un email pour ${contact.name}`}
      description="William prepare une base personnalisable avant envoi."
      className="max-w-3xl"
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-border bg-panel-strong/55 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/12 text-accent">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-semibold">William prepare une base</p>
          <p className="mt-2 text-sm text-muted">
            Ajustez le ton, puis envoyez depuis votre messagerie.
          </p>
          <label className="mt-5 block text-sm font-medium">
            Type de mail
            <Select
              className="mt-2"
              value={template}
              onChange={(event) => {
                setTemplate(event.target.value as ContactEmailTemplate);
                setMessage(null);
              }}
            >
              {contactEmailTemplateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        </aside>

        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Objet
            <Input
              key={`${contact.id}-${template}-subject`}
              ref={subjectRef}
              className="mt-2"
              defaultValue={generated.subject}
            />
          </label>
          <label className="block text-sm font-medium">
            Message
            <Textarea
              key={`${contact.id}-${template}-body`}
              ref={bodyRef}
              className="mt-2 min-h-[280px] font-mono text-sm leading-6"
              defaultValue={generated.body}
            />
          </label>

          {message ? (
            <p className="rounded-md bg-panel-strong px-3 py-2 text-sm text-muted">{message}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              William vous laisse valider chaque mot avant depart.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={copyDraft}>
                <Copy className="mr-2 h-4 w-4" aria-hidden />
                Copier
              </Button>
              <Button type="button" onClick={openMailer}>
                <Mail className="mr-2 h-4 w-4" aria-hidden />
                Ouvrir messagerie
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
