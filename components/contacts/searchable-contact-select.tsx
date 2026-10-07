"use client";

import { Select } from "@/components/ui/select";
import type { Contact } from "@/types";

export function SearchableContactSelect({ contacts, defaultValue = "" }: { contacts: Contact[]; defaultValue?: string }) {
  return <label className="mt-2 block min-w-0 text-xs font-medium text-muted">
    Contact à rattacher
    <Select searchable className="mt-2" name="contactId" defaultValue={defaultValue}>
      <option value="">Aucun contact rattaché</option>
      {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.organization && contact.organization !== contact.name ? ` — ${contact.organization}` : ""}{contact.email ? ` · ${contact.email}` : ""}</option>)}
    </Select>
  </label>;
}
