"use client";

import { Eye, FilePenLine, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeletePlatformEmailTemplate, adminSavePlatformEmailTemplate } from "@/app/(dashboard)/admin/actions";
import { RichEmailEditor } from "@/components/campaigns/rich-email-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { emailVariables } from "@/lib/email-template-variables";
import type { AdminPlatformEmailTemplate } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";

const emptyBody: Json = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Bonjour @prenom_contact," }] },
    { type: "paragraph", content: [{ type: "text", text: "Je vous contacte au sujet de @titre_spectacle." }] },
    { type: "paragraph", content: [{ type: "text", text: "Bien a vous," }] },
  ],
};

export function PlatformEmailTemplateStudio({ templates }: { templates: AdminPlatformEmailTemplate[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);
  const selected = templates.find((template) => template.id === selectedId);
  const [name, setName] = useState(selected?.name ?? "Nouveau modele global");
  const [messageType, setMessageType] = useState<AdminPlatformEmailTemplate["messageType"]>(selected?.messageType ?? "first-touch");
  const [subject, setSubject] = useState(selected?.subjectTemplate ?? "@titre_spectacle - @structure");
  const [body, setBody] = useState<Json>(selected?.bodyJson ?? emptyBody);
  const [active, setActive] = useState(selected?.active ?? true);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(template?: AdminPlatformEmailTemplate) {
    setSelectedId(template?.id ?? null);
    setName(template?.name ?? "Nouveau modele global");
    setMessageType(template?.messageType ?? "first-touch");
    setSubject(template?.subjectTemplate ?? "@titre_spectacle - @structure");
    setBody(template?.bodyJson ?? emptyBody);
    setActive(template?.active ?? true);
    setPreview(false);
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await adminSavePlatformEmailTemplate(selectedId, { name, messageType, subjectTemplate: subject, bodyJson: body, active });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function remove() {
    if (!selectedId || !window.confirm(`Supprimer le modele « ${name} » ?`)) return;
    startTransition(async () => {
      const result = await adminDeletePlatformEmailTemplate(selectedId);
      setMessage(result.message);
      if (result.ok) { load(); router.refresh(); }
    });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-panel">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div><h3 className="text-xl font-semibold">Modeles proposes a toutes les compagnies</h3><p className="mt-1 text-sm text-muted">Les compagnies pourront les utiliser tels quels ou enregistrer leur propre copie.</p></div>
        <Button type="button" variant="secondary" onClick={() => load()}><Plus className="mr-2 h-4 w-4" />Nouveau modele</Button>
      </header>
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-panel-strong/45 p-3 lg:border-b-0 lg:border-r">
          {templates.length === 0 ? <p className="p-3 text-sm text-muted">Aucun modele global.</p> : templates.map((template) => (
            <button key={template.id} className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm ${selectedId === template.id ? "bg-accent text-white" : "hover:bg-panel"}`} type="button" onClick={() => load(template)}>
              <span className="truncate font-medium">{template.name}</span>{!template.active ? <Badge>Masque</Badge> : null}
            </button>
          ))}
        </aside>
        <div className="min-w-0 space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <Field label="Nom"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Usage"><Select value={messageType} onChange={(event) => setMessageType(event.target.value as typeof messageType)}><option value="first-touch">Premier contact</option><option value="follow-up">Relance</option><option value="date-option">Invitation</option></Select></Field>
          </div>
          <Field label="Objet"><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
          <div className="flex flex-wrap gap-1.5">{emailVariables.slice(0, 8).map((variable) => <button key={variable.token} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-accent hover:text-accent" type="button" onClick={() => setSubject((current) => `${current} ${variable.token}`)}>{variable.token}</button>)}</div>
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Corps du message</p><Button type="button" variant="secondary" onClick={() => setPreview((current) => !current)}>{preview ? <FilePenLine className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}{preview ? "Editer" : "Apercu brut"}</Button></div>
          <RichEmailEditor key={`${selectedId ?? "new"}-${preview}`} content={body} editable={!preview} showVariables={!preview} onChange={(nextBody) => setBody(nextBody)} />
          <label className="flex items-center gap-2 text-sm"><input checked={active} type="checkbox" onChange={(event) => setActive(event.target.checked)} />Proposer ce modele aux compagnies</label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="flex items-center gap-3"><Button disabled={!selectedId || isPending} type="button" variant="ghost" onClick={remove}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button><p className="text-sm text-muted" role="status">{message}</p></div><Button disabled={isPending} type="button" onClick={save}><Save className="mr-2 h-4 w-4" />Enregistrer</Button></div>
        </div>
      </div>
    </section>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="block text-sm font-medium">{label}<span className="mt-2 block">{children}</span></label>; }
