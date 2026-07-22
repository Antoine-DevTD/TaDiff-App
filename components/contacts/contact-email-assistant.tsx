"use client";

import { EmailComposer } from "@/components/campaigns/email-workspace";
import { Dialog } from "@/components/ui/dialog";
import type { Contact, EmailTemplate, Show, ShowDocument } from "@/types";

export function ContactEmailAssistant({
  contacts,
  documents,
  onClose,
  open,
  selectedContacts,
  shows,
  templates,
}: {
  contacts: Contact[];
  documents: ShowDocument[];
  onClose: () => void;
  open: boolean;
  selectedContacts: Contact[];
  shows: Show[];
  templates: EmailTemplate[];
}) {
  if (selectedContacts.length === 0) return null;

  const title = selectedContacts.length === 1
    ? `Préparer un email pour ${selectedContacts[0].name}`
    : `Préparer un email pour ${selectedContacts.length} contacts`;

  return (
    <Dialog
      className="max-w-[96rem]"
      description="Choisissez le spectacle, le modèle et les pièces utiles. Aucun email ne part sans votre validation."
      eyebrow="Nouveau brouillon"
      open={open}
      title={title}
      onClose={onClose}
    >
      <EmailComposer
        contacts={contacts}
        documents={documents}
        initialContactIds={selectedContacts.map((contact) => contact.id)}
        shows={shows}
        templates={templates}
      />
    </Dialog>
  );
}
