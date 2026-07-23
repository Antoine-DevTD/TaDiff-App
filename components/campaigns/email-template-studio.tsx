"use client";

import { CopyPlus, Eye, FilePenLine, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteEmailTemplate, saveEmailTemplate } from "@/app/(dashboard)/actions";
import { RichEmailEditor } from "@/components/campaigns/rich-email-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { builtInEmailTemplates } from "@/lib/email-template-presets";
import { emailVariables, renderTemplateDocument, renderTemplateText } from "@/lib/email-template-variables";
import type { ContactEmailTemplate } from "@/lib/email-templates";
import type { Contact, EmailTemplate, Show } from "@/types";
import type { Json } from "@/types/database.types";

type TemplateChoice = {
  id: string;
  name: string;
  messageType: ContactEmailTemplate;
  subjectTemplate: string;
  bodyJson: Json;
  custom: boolean;
};

export function EmailTemplateStudio({ contacts, shows, templates }: { contacts: Contact[]; shows: Show[]; templates: EmailTemplate[] }) {
  const router = useRouter();
  const choices = useMemo<TemplateChoice[]>(() => [
    ...builtInEmailTemplates.map((template) => ({ ...template, custom: false })),
    ...templates.map((template) => ({ ...template, custom: template.scope !== "platform" })),
  ], [templates]);
  const firstChoice = choices[0];
  const [selectedId, setSelectedId] = useState(firstChoice?.id ?? "new");
  const [name, setName] = useState(firstChoice?.name ?? "Nouveau modele");
  const [messageType, setMessageType] = useState<ContactEmailTemplate>(firstChoice?.messageType ?? "first-touch");
  const [subject, setSubject] = useState(firstChoice?.subjectTemplate ?? "@titre_spectacle - @structure");
  const [body, setBody] = useState<Json>(firstChoice?.bodyJson ?? { type: "doc", content: [] });
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sampleContact = contacts[0];
  const sampleShow = shows[0];
  const selected = choices.find((choice) => choice.id === selectedId);

  function loadTemplate(id: string) {
    const choice = choices.find((item) => item.id === id);
    if (!choice) return;
    setSelectedId(id);
    setName(choice.name);
    setMessageType(choice.messageType);
    setSubject(choice.subjectTemplate);
    setBody(choice.bodyJson);
    setMode("edit");
    setMessage(null);
  }

  function createTemplate() {
    setSelectedId("new");
    setName("Nouveau modèle");
    setMessageType("first-touch");
    setSubject("@titre_spectacle - @structure");
    setBody({ type: "doc", content: [] });
    setMode("edit");
    setMessage(null);
  }

  function duplicateTemplate() {
    setSelectedId("new");
    setName(`${name} - copie`);
    setMessage("La copie sera creee lors de l'enregistrement.");
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveEmailTemplate(selected?.custom ? selected.id : null, {
        name,
        messageType,
        subjectTemplate: subject,
        bodyJson: body,
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function remove() {
    if (!selected?.custom || !window.confirm(`Supprimer le modele « ${selected.name} » ?`)) return;
    startTransition(async () => {
      const result = await deleteEmailTemplate(selected.id);
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
        loadTemplate(choices.find((choice) => !choice.custom)?.id ?? "");
      }
    });
  }

  const canPreview = Boolean(sampleContact);
  const previewContext = sampleContact ? { contact: sampleContact, show: sampleShow } : null;

  return (
    <section id="modeles" className="overflow-hidden rounded-lg border border-border bg-panel" aria-labelledby="email-template-title">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Bibliotheque de messages</p>
          <h2 id="email-template-title" className="mt-1 text-xl font-semibold">Modeles d&apos;emails</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={createTemplate}><Plus className="mr-2 h-4 w-4" />Nouveau modèle</Button>
          <Button disabled={!selectedId} type="button" variant="secondary" onClick={duplicateTemplate}><CopyPlus className="mr-2 h-4 w-4" />Dupliquer</Button>
        </div>
      </div>

      <div className="grid min-w-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-panel-strong/45 p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Modeles proposes</p>
          <div className="space-y-1">
            {choices.map((choice) => (
              <button key={choice.id} className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm transition ${selectedId === choice.id ? "bg-accent text-white" : "hover:bg-panel"}`} type="button" onClick={() => loadTemplate(choice.id)}>
                <span className="truncate font-medium">{choice.name}</span>
                {choice.custom ? <Badge className={selectedId === choice.id ? "border-white/25 bg-white/15 text-white" : ""}>Perso</Badge> : null}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block text-sm font-medium">Nom du modèle<Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="block text-sm font-medium">Usage<Select className="mt-2" value={messageType} onChange={(event) => setMessageType(event.target.value as ContactEmailTemplate)}><option value="first-touch">Premier contact</option><option value="follow-up">Relance</option><option value="date-option">Invitation</option></Select></label>
          </div>

          <label className="mt-4 block text-sm font-medium">Objet<Input className="mt-2" value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {emailVariables.filter((variable) => ["@titre_spectacle", "@structure", "@prenom_contact"].includes(variable.token)).map((variable) => (
              <button key={variable.token} className="rounded-full border border-border bg-panel-strong px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-accent" type="button" onClick={() => setSubject((current) => `${current}${current.endsWith(" ") ? "" : " "}${variable.token}`)}>{variable.token}</button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Corps du message</p>
            <div className="flex rounded-md border border-border p-1">
              <Button className="min-h-8 px-3 py-1" type="button" variant={mode === "edit" ? "primary" : "ghost"} onClick={() => setMode("edit")}><FilePenLine className="mr-2 h-4 w-4" />Editer</Button>
              <Button className="min-h-8 px-3 py-1" disabled={!canPreview} type="button" variant={mode === "preview" ? "primary" : "ghost"} onClick={() => setMode("preview")}><Eye className="mr-2 h-4 w-4" />Apercu</Button>
            </div>
          </div>

          <div className="mt-2">
            {mode === "edit" ? (
              <RichEmailEditor key={selectedId} content={body} showVariables onChange={(nextBody) => setBody(nextBody)} />
            ) : previewContext ? (
              <div className="space-y-3 rounded-lg bg-panel-strong/45 p-4">
                <p className="text-sm"><span className="font-semibold">Objet :</span> {renderTemplateText(subject, previewContext)}</p>
                <RichEmailEditor key={`${selectedId}-preview`} content={renderTemplateDocument(body, previewContext)} editable={false} />
                <p className="text-xs text-muted">Apercu avec {sampleContact.name}{sampleShow ? ` et ${sampleShow.title}` : ""}.</p>
              </div>
            ) : null}
          </div>

          {message ? <p className="mt-4 text-sm text-muted" role="status">{message}</p> : null}
          <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-border pt-4">
            <Button disabled={!selected?.custom || isPending} type="button" variant="ghost" onClick={remove}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
            <Button disabled={isPending} type="button" onClick={save}><Save className="mr-2 h-4 w-4" />{isPending ? "Enregistrement..." : selected?.custom ? "Enregistrer" : "Enregistrer une copie"}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
