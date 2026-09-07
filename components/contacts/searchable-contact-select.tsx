"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Contact } from "@/types";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();

export function SearchableContactSelect({ contacts, defaultValue = "" }: { contacts: Contact[]; defaultValue?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(defaultValue);
  const matches = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return contacts.filter((contact) => {
      const text = normalize(`${contact.name} ${contact.organization} ${contact.email ?? ""}`);
      return terms.every((term) => text.includes(term));
    });
  }, [contacts, query]);
  const retained = contacts.find((contact) => contact.id === selected && !matches.some((match) => match.id === contact.id));
  function label(contact: Contact) {
    return contact.organization && normalize(contact.organization) !== normalize(contact.name)
      ? `${contact.name} — ${contact.organization}` : contact.name;
  }
  return (
    <div className="mt-2 min-w-0 space-y-2">
      <label className="block text-xs font-medium text-muted" htmlFor={`${id}-search`}>Rechercher un contact</label>
      <Input id={`${id}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, structure ou email" autoComplete="off" aria-controls={`${id}-select`} />
      <Select id={`${id}-select`} aria-label="Contact à rattacher" name="contactId" value={selected} onChange={(event) => setSelected(event.target.value)}>
        <option value="">Aucun contact rattaché</option>
        {retained ? <option value={retained.id}>{label(retained)} (sélection actuelle)</option> : null}
        {matches.map((contact) => <option key={contact.id} value={contact.id}>{label(contact)}</option>)}
      </Select>
      <p className="text-xs text-muted" role="status">{matches.length === 0 ? "Aucun résultat. Essayez un autre nom ou créez un contact." : `${matches.length} contact${matches.length > 1 ? "s" : ""} trouvé${matches.length > 1 ? "s" : ""}.`}</p>
    </div>
  );
}
