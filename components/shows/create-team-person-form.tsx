"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShowTeamPerson } from "@/app/(dashboard)/shows/[id]/rehearsal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateTeamPersonForm({ showId, onCreated, onOpenChange }: { showId: string; onCreated: (contactId: string, job: string) => void; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return <div className="mt-4 border-b border-border pb-4">
    <Button type="button" variant="secondary" className="w-full" aria-expanded={open} disabled={pending} onClick={() => { setOpen(!open); onOpenChange(!open); setMessage(""); }}>{open ? "Revenir au carnet" : "Créer une personne"}</Button>
    {open ? <form className="mt-4 space-y-3" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const field = (name: string) => String(values.get(name) ?? "");
      start(async () => {
        try {
          const result = await createShowTeamPerson({ showId, name: field("name"), email: field("email"), jobTitle: field("jobTitle"), characterName: field("characterName"), alternateGroup: field("alternateGroup") });
          setMessage(result.message);
          if (result.contactId) { onCreated(result.ok ? "" : result.contactId, result.ok ? "" : field("jobTitle")); setOpen(false); onOpenChange(false); router.refresh(); }
        } catch { setMessage("L’ajout a échoué. Actualisez le carnet avant de réessayer pour vérifier si la personne a été créée."); }
      });
    }}>
      <label className="block text-sm">Nom<Input name="name" required minLength={2} maxLength={200} /></label>
      <label className="block text-sm">Email (facultatif)<Input name="email" type="email" /></label>
      <label className="block text-sm">Métier / fonction<Input name="jobTitle" required minLength={2} maxLength={80} placeholder="Comédienne, mise en scène, régie…" /></label>
      <label className="block text-sm">Rôle interprété (facultatif)<Input name="characterName" maxLength={80} /></label>
      <label className="block text-sm">Groupe d’alternance (facultatif)<Input name="alternateGroup" maxLength={80} /></label>
      <p className="text-xs text-muted">La personne sera aussi créée dans le carnet, sans statut de prospect. Cela ne crée pas de compte et ne donne pas accès aux dossiers.</p>
      <Button type="submit" disabled={pending}>{pending ? "Ajout…" : "Créer et ajouter à l’équipe"}</Button>
    </form> : null}
    {message ? <p role="status" className="mt-3 text-sm text-muted">{message}</p> : null}
  </div>;
}
