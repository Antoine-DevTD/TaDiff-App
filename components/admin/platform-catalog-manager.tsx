"use client";

import { ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  adminDeleteGrantCatalogItem,
  adminDeletePatronageCatalogItem,
  adminSaveGrantCatalogItem,
  adminSavePatronageCatalogItem,
} from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminGrantCatalogItem, AdminPatronageCatalogItem } from "@/lib/supabase/admin";

type CatalogKind = "grants" | "patronage";

export function PlatformCatalogManager({ grants, patronage }: { grants: AdminGrantCatalogItem[]; patronage: AdminPatronageCatalogItem[] }) {
  const [kind, setKind] = useState<CatalogKind>("grants");
  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-md border border-border bg-panel p-1">
        <Button type="button" variant={kind === "grants" ? "primary" : "ghost"} onClick={() => setKind("grants")}>Subventions</Button>
        <Button type="button" variant={kind === "patronage" ? "primary" : "ghost"} onClick={() => setKind("patronage")}>Mecenat</Button>
      </div>
      {kind === "grants" ? <GrantCatalog grants={grants} /> : <PatronageCatalog items={patronage} />}
    </div>
  );
}

const emptyGrant: Omit<AdminGrantCatalogItem, "id"> = {
  title: "", funder: "", territory: "France", discipline: "", deadline: "", amountMax: 0,
  eligibility: "", requirements: [], themes: [], sourceUrl: "", active: true, lastVerifiedAt: "",
};

function GrantCatalog({ grants }: { grants: AdminGrantCatalogItem[] }) {
  const [editing, setEditing] = useState<AdminGrantCatalogItem | null>(null);
  const [draft, setDraft] = useState(emptyGrant);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const edit = (item?: AdminGrantCatalogItem) => { setEditing(item ?? null); setDraft(item ?? emptyGrant); setMessage(null); };
  const update = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => startTransition(async () => {
    const result = await adminSaveGrantCatalogItem(editing?.id ?? null, draft);
    setMessage(result.message);
    if (result.ok) edit();
  });
  const remove = (item: AdminGrantCatalogItem) => {
    if (!window.confirm(`Supprimer « ${item.title} » ?`)) return;
    startTransition(async () => setMessage((await adminDeleteGrantCatalogItem(item.id)).message));
  };

  return (
    <CatalogLayout title="Catalogue des subventions" description="Chaque modification actualise automatiquement la source correspondante dans le corpus William." onNew={() => edit()}>
      <CatalogForm title={editing ? `Modifier ${editing.title}` : "Ajouter une aide"} onSave={save} pending={isPending} message={message}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom de l'aide"><Input value={draft.title} onChange={(event) => update("title", event.target.value)} /></Field>
          <Field label="Financeur"><Input value={draft.funder} onChange={(event) => update("funder", event.target.value)} /></Field>
          <Field label="Territoire"><Input value={draft.territory} onChange={(event) => update("territory", event.target.value)} /></Field>
          <Field label="Discipline"><Input value={draft.discipline} onChange={(event) => update("discipline", event.target.value)} /></Field>
          <Field label="Date limite"><Input type="date" value={draft.deadline} onChange={(event) => update("deadline", event.target.value)} /></Field>
          <Field label="Montant maximal"><Input min="0" type="number" value={draft.amountMax} onChange={(event) => update("amountMax", Number(event.target.value))} /></Field>
          <Field label="Themes, separes par des virgules"><Input value={draft.themes.join(", ")} onChange={(event) => update("themes", splitList(event.target.value))} /></Field>
          <Field label="Pieces demandees, separees par des virgules"><Input value={draft.requirements.join(", ")} onChange={(event) => update("requirements", splitList(event.target.value))} /></Field>
          <Field label="Source officielle"><Input type="url" value={draft.sourceUrl} onChange={(event) => update("sourceUrl", event.target.value)} /></Field>
          <Field label="Verifie le"><Input type="date" value={draft.lastVerifiedAt} onChange={(event) => update("lastVerifiedAt", event.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Eligibilite"><Textarea value={draft.eligibility} onChange={(event) => update("eligibility", event.target.value)} /></Field></div>
        </div>
        <ActiveToggle active={draft.active} onChange={(active) => update("active", active)} />
      </CatalogForm>
      <CatalogList count={grants.length} empty="Aucune subvention dans le catalogue.">
        {grants.map((item) => <CatalogRow key={item.id} title={item.title} subtitle={`${item.funder}${item.deadline ? ` · ${new Date(item.deadline).toLocaleDateString("fr-FR")}` : ""}`} active={item.active} url={item.sourceUrl} onEdit={() => edit(item)} onDelete={() => remove(item)} />)}
      </CatalogList>
    </CatalogLayout>
  );
}

const emptyPatronage: Omit<AdminPatronageCatalogItem, "id"> = {
  organizationName: "", programName: "", themes: [], territories: ["France"], nextDeadline: "",
  amountMin: 0, amountMax: 0, eligibility: "", sourceUrl: "", notes: "", active: true, lastVerifiedAt: "",
};

function PatronageCatalog({ items }: { items: AdminPatronageCatalogItem[] }) {
  const [editing, setEditing] = useState<AdminPatronageCatalogItem | null>(null);
  const [draft, setDraft] = useState(emptyPatronage);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const edit = (item?: AdminPatronageCatalogItem) => { setEditing(item ?? null); setDraft(item ?? emptyPatronage); setMessage(null); };
  const update = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => startTransition(async () => {
    const result = await adminSavePatronageCatalogItem(editing?.id ?? null, draft);
    setMessage(result.message);
    if (result.ok) edit();
  });
  const remove = (item: AdminPatronageCatalogItem) => {
    if (!window.confirm(`Supprimer « ${item.programName} » ?`)) return;
    startTransition(async () => setMessage((await adminDeletePatronageCatalogItem(item.id)).message));
  };

  return (
    <CatalogLayout title="Catalogue du mecenat" description="Referentiel des fondations, appels et programmes a proposer aux compagnies." onNew={() => edit()}>
      <CatalogForm title={editing ? `Modifier ${editing.programName}` : "Ajouter un programme"} onSave={save} pending={isPending} message={message}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Organisation"><Input value={draft.organizationName} onChange={(event) => update("organizationName", event.target.value)} /></Field>
          <Field label="Programme"><Input value={draft.programName} onChange={(event) => update("programName", event.target.value)} /></Field>
          <Field label="Themes"><Input value={draft.themes.join(", ")} onChange={(event) => update("themes", splitList(event.target.value))} /></Field>
          <Field label="Territoires"><Input value={draft.territories.join(", ")} onChange={(event) => update("territories", splitList(event.target.value))} /></Field>
          <Field label="Prochaine echeance"><Input type="date" value={draft.nextDeadline} onChange={(event) => update("nextDeadline", event.target.value)} /></Field>
          <Field label="Verifie le"><Input type="date" value={draft.lastVerifiedAt} onChange={(event) => update("lastVerifiedAt", event.target.value)} /></Field>
          <Field label="Montant minimal"><Input min="0" type="number" value={draft.amountMin} onChange={(event) => update("amountMin", Number(event.target.value))} /></Field>
          <Field label="Montant maximal"><Input min="0" type="number" value={draft.amountMax} onChange={(event) => update("amountMax", Number(event.target.value))} /></Field>
          <div className="md:col-span-2"><Field label="Eligibilite"><Textarea value={draft.eligibility} onChange={(event) => update("eligibility", event.target.value)} /></Field></div>
          <Field label="Source officielle"><Input type="url" value={draft.sourceUrl} onChange={(event) => update("sourceUrl", event.target.value)} /></Field>
          <Field label="Notes"><Input value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
        </div>
        <ActiveToggle active={draft.active} onChange={(active) => update("active", active)} />
      </CatalogForm>
      <CatalogList count={items.length} empty="Aucun programme de mecenat dans le catalogue.">
        {items.map((item) => <CatalogRow key={item.id} title={item.programName} subtitle={`${item.organizationName}${item.nextDeadline ? ` · ${new Date(item.nextDeadline).toLocaleDateString("fr-FR")}` : ""}`} active={item.active} url={item.sourceUrl} onEdit={() => edit(item)} onDelete={() => remove(item)} />)}
      </CatalogList>
    </CatalogLayout>
  );
}

function CatalogLayout({ children, description, onNew, title }: { children: React.ReactNode; description: string; onNew: () => void; title: string }) {
  return <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-1 text-sm text-muted">{description}</p></div><Button type="button" onClick={onNew}><Plus className="mr-2 h-4 w-4" />Nouvelle fiche</Button></div>{children}</div>;
}
function CatalogForm({ children, message, onSave, pending, title }: { children: React.ReactNode; message: string | null; onSave: () => void; pending: boolean; title: string }) {
  return <Card className="space-y-4 p-5"><p className="font-semibold">{title}</p>{children}<div className="flex items-center justify-between gap-3 border-t border-border pt-4"><p className="text-sm text-muted" role="status">{message}</p><Button disabled={pending} type="button" onClick={onSave}><Save className="mr-2 h-4 w-4" />Enregistrer</Button></div></Card>;
}
function CatalogList({ children, count, empty }: { children: React.ReactNode; count: number; empty: string }) {
  return <Card className="space-y-2 p-4">{count > 0 ? children : <p className="p-3 text-sm text-muted">{empty}</p>}</Card>;
}
function CatalogRow({ active, onDelete, onEdit, subtitle, title, url }: { active: boolean; onDelete: () => void; onEdit: () => void; subtitle: string; title: string; url: string }) {
  const safeUrl = /^https?:\/\//i.test(url) ? url : "";
  return <div className="flex flex-col gap-3 rounded-md border border-border bg-panel-strong/35 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{title}</p><Badge tone={active ? "success" : "neutral"}>{active ? "Publie" : "Masque"}</Badge></div><p className="mt-1 text-xs text-muted">{subtitle}</p></div><div className="flex gap-1">{safeUrl ? <a className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-panel-strong" href={safeUrl} rel="noreferrer" target="_blank" title="Ouvrir la source"><ExternalLink className="h-4 w-4" /></a> : null}<Button aria-label="Modifier" className="h-10 px-3" type="button" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button><Button aria-label="Supprimer" className="h-10 px-3 text-danger" type="button" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div></div>;
}
function ActiveToggle({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm"><input checked={active} type="checkbox" onChange={(event) => onChange(event.target.checked)} />Visible pour les compagnies</label>;
}
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="block text-sm font-medium">{label}<span className="mt-2 block">{children}</span></label>; }
function splitList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
