"use client";

import { UserPlus, Users, X } from "lucide-react";
import { useState, useTransition } from "react";
import { addShowTeamMember, removeShowTeamMember } from "@/app/(dashboard)/shows/[id]/rehearsal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ShowTeamMember } from "@/lib/rehearsals";
import type { Contact } from "@/types";
import { CreateTeamPersonForm } from "@/components/shows/create-team-person-form";

export function ShowTeamPanel({ contacts, initialTeam, showId }: { contacts: Contact[]; initialTeam: ShowTeamMember[]; showId: string }) {
  const people = contacts.filter((contact) => contact.contactType === "person" && !initialTeam.some((member) => member.contactId === contact.id));
  const [contactId, setContactId] = useState(people[0]?.id ?? "");
  const [creatingPerson, setCreatingPerson] = useState(false);
  const [jobTitle, setJobTitle] = useState(""); const [characterName, setCharacterName] = useState(""); const [alternateGroup, setAlternateGroup] = useState("");
  const [message, setMessage] = useState(""); const [isPending, startTransition] = useTransition();
  function add() { startTransition(async () => { const result = await addShowTeamMember(showId, contactId, jobTitle, characterName, alternateGroup); setMessage(result.message); if (result.ok) { setJobTitle(""); setCharacterName(""); setAlternateGroup(""); } }); }
  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <section aria-labelledby="show-team-title">
      <div className="flex items-start gap-3 border-b border-border pb-5"><Users aria-hidden className="mt-0.5 h-5 w-5 text-accent" /><div><h3 id="show-team-title" className="text-lg font-semibold">Équipe du spectacle</h3><p className="mt-1 text-sm text-muted">Les personnes artistiques, techniques et de production rattachées à ce spectacle.</p></div></div>
      {initialTeam.length ? <ul className="divide-y divide-border">{initialTeam.map((member) => <li className="flex items-start justify-between gap-4 py-4" key={member.id}><div><p className="font-medium">{member.name}</p><p className="mt-1 text-sm text-muted">{member.jobTitle}{member.characterName ? ` · ${member.characterName}` : ""}{member.alternateGroup ? ` · alternance ${member.alternateGroup}` : ""}</p>{member.email ? <p className="mt-1 text-xs text-muted">{member.email}</p> : null}</div><button aria-label={`Retirer ${member.name} de l’équipe`} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-panel-strong hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" disabled={isPending} onClick={() => startTransition(async () => setMessage((await removeShowTeamMember(showId, member.id)).message))} type="button"><X aria-hidden className="h-4 w-4" /></button></li>)}</ul> : <div className="py-10 text-center"><Users aria-hidden className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 font-medium">L’équipe n’est pas encore renseignée</p><p className="mx-auto mt-1 max-w-md text-sm text-muted">Ajoutez les comédiens, la mise en scène, la régie et la production depuis le carnet.</p></div>}
    </section>
    <section aria-labelledby="add-team-member-title" className="h-fit border border-border bg-panel p-5"><div className="flex items-center gap-2"><UserPlus aria-hidden className="h-5 w-5 text-accent" /><h3 id="add-team-member-title" className="font-semibold">Ajouter une personne</h3></div>
      <CreateTeamPersonForm showId={showId} onOpenChange={setCreatingPerson} onCreated={(id, job) => { setContactId(id); setJobTitle(job); }} />
      {!creatingPerson ? <div>
      <div className="mt-5 space-y-4"><label className="block text-sm font-medium">Personne<Select className="mt-2" value={contactId} onChange={(event) => setContactId(event.target.value)}><option value="">Choisir dans les contacts</option>{people.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</Select></label><label className="block text-sm font-medium">Fonction<Input className="mt-2" placeholder="Comédienne, mise en scène, régie…" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} /></label><label className="block text-sm font-medium">Rôle interprété <span className="font-normal text-muted">(facultatif)</span><Input className="mt-2" placeholder="Ex. Hamlet" value={characterName} onChange={(event) => setCharacterName(event.target.value)} /></label><label className="block text-sm font-medium">Groupe d’alternance <span className="font-normal text-muted">(facultatif)</span><Input className="mt-2" placeholder="Ex. Hamlet" value={alternateGroup} onChange={(event) => setAlternateGroup(event.target.value)} /></label><Button className="w-full" disabled={isPending || !contactId || !jobTitle.trim()} onClick={add} type="button">{isPending ? "Ajout…" : "Ajouter à l’équipe"}</Button>{message ? <p aria-live="polite" className="text-sm text-muted">{message}</p> : null}{people.length === 0 ? <p className="text-xs text-muted">Toutes les personnes du carnet sont déjà rattachées, ou le carnet est vide.</p> : null}</div>
      </div> : null}
    </section>
  </div>;
}
