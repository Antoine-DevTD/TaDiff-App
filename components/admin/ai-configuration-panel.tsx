"use client";

import { BookOpen, CheckCircle2, KeyRound, Plus, Save, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminDeleteRagDocument, adminIndexRagDocuments, adminSaveAiSettings, adminSaveRagDocument } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminAiSettings, AdminRagDocument, AiProviderReadiness } from "@/lib/supabase/admin";

export function AiConfigurationPanel({ documents, readiness, settings }: { documents: AdminRagDocument[]; readiness: AiProviderReadiness; settings: AdminAiSettings }) {
  const router = useRouter();
  const [config, setConfig] = useState(settings);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "", sourceUrl: "", active: true });
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const manualDocuments = documents.filter((document) => document.sourceType === "manual");
  const automaticDocuments = documents.filter((document) => document.sourceType !== "manual");

  const saveConfig = () => startTransition(async () => setConfigMessage((await adminSaveAiSettings(config)).message));
  const addDocument = () => startTransition(async () => {
    const result = await adminSaveRagDocument(null, draft);
    setDocumentMessage(result.message);
    if (result.ok) { setDraft({ title: "", content: "", sourceUrl: "", active: true }); router.refresh(); }
  });
  const removeDocument = (id: string) => {
    if (!window.confirm("Supprimer cette source du corpus ?")) return;
    startTransition(async () => { setDocumentMessage((await adminDeleteRagDocument(id)).message); router.refresh(); });
  };
  const indexDocuments = () => startTransition(async () => {
    const result = await adminIndexRagDocuments();
    setDocumentMessage(result.message);
    if (result.ok) router.refresh();
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <Card className="space-y-5 p-5">
          <div><h3 className="text-xl font-semibold">Configuration de William</h3><p className="mt-1 text-sm text-muted">Le fournisseur conversationnel et le moteur d&apos;embeddings peuvent être differents.</p></div>
          <label className="flex items-center gap-2 text-sm font-medium"><input checked={config.enabled} type="checkbox" onChange={(event) => setConfig((current) => ({ ...current, enabled: event.target.checked }))} />Autoriser William lorsque la cle du fournisseur est disponible</label>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fournisseur conversationnel"><Select value={config.provider} onChange={(event) => { const provider = event.target.value as AdminAiSettings["provider"]; setConfig((current) => ({ ...current, provider, model: defaultModelByProvider[provider] })); }}><option value="mistral">Mistral AI</option><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic / Claude</option></Select></Field>
            <Field label="Modele"><Input value={config.model} onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))} /></Field>
            <Field label="Embeddings"><Select value={config.embeddingProvider} onChange={(event) => setConfig((current) => ({ ...current, embeddingProvider: event.target.value as AdminAiSettings["embeddingProvider"] }))}><option value="openai">OpenAI</option><option value="supabase">Supabase gte-small</option></Select></Field>
            <Field label="Modele d'embedding"><Input value={config.embeddingModel} onChange={(event) => setConfig((current) => ({ ...current, embeddingModel: event.target.value }))} /></Field>
            <Field label="Sources restituees"><Input max="30" min="1" type="number" value={config.ragTopK} onChange={(event) => setConfig((current) => ({ ...current, ragTopK: Number(event.target.value) }))} /></Field>
          </div>
          <Field label="Instructions permanentes"><Textarea className="min-h-40" value={config.systemPrompt} onChange={(event) => setConfig((current) => ({ ...current, systemPrompt: event.target.value }))} /></Field>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4"><p className="text-sm text-muted" role="status">{configMessage}</p><Button disabled={isPending} type="button" onClick={saveConfig}><Save className="mr-2 h-4 w-4" />Enregistrer</Button></div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-accent" /><h3 className="font-semibold">Secrets Vercel</h3></div>
          <p className="text-sm text-muted">Les cles ne sont jamais enregistrees en base ni affichees dans le navigateur.</p>
          <Readiness label="OPENAI_API_KEY" ready={readiness.openai} />
          <Readiness label="DEEPSEEK_API_KEY" ready={readiness.deepseek} />
          <Readiness label="ANTHROPIC_API_KEY" ready={readiness.anthropic} />
          <Readiness label="MISTRAL_API_KEY" ready={readiness.mistral} />
          <p className="rounded-md border border-border bg-panel-strong/40 p-3 text-xs text-muted">Après ajout d&apos;une clé dans Vercel, un redéploiement reste nécessaire pour que le serveur la lise.</p>
        </Card>
      </div>

      <Card className="space-y-5 p-5">
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-accent" /><div><h3 className="text-xl font-semibold">Corpus de connaissances</h3><p className="mt-1 text-sm text-muted">Les catalogues sont synchronises automatiquement. Ajoutez ici les regles, guides et sources metier communes.</p></div></div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Titre"><Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></Field><Field label="Source"><Input type="url" value={draft.sourceUrl} onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))} /></Field><div className="md:col-span-2"><Field label="Contenu fiable et date de validite"><Textarea className="min-h-40" value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} /></Field></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted" role="status">{documentMessage}</p><div className="flex flex-wrap gap-2"><Button disabled={isPending} type="button" variant="secondary" onClick={indexDocuments}><BookOpen className="mr-2 h-4 w-4" />Indexer les sources</Button><Button disabled={isPending} type="button" onClick={addDocument}><Plus className="mr-2 h-4 w-4" />Ajouter au corpus</Button></div></div>
        <div className="grid gap-3 lg:grid-cols-2">
          {manualDocuments.map((document) => <DocumentRow key={document.id} document={document} onDelete={() => removeDocument(document.id)} />)}
          {automaticDocuments.map((document) => <DocumentRow key={document.id} document={document} />)}
        </div>
        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3"><Metric label="Sources totales" value={documents.length} /><Metric label="Indexees par vecteur" value={documents.filter((document) => document.embedded).length} /><Metric label="Recherche texte disponible" value={documents.filter((document) => document.active).length} /></div>
      </Card>
    </div>
  );
}

function Readiness({ label, ready }: { label: string; ready: boolean }) { return <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><code>{label}</code>{ready ? <Badge tone="success"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Presente</Badge> : <Badge tone="warning"><XCircle className="mr-1 h-3.5 w-3.5" />Absente</Badge>}</div>; }
function DocumentRow({ document, onDelete }: { document: AdminRagDocument; onDelete?: () => void }) { return <div className="rounded-md border border-border bg-panel-strong/35 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{document.title}</p><div className="mt-1 flex flex-wrap gap-2"><Badge>{document.sourceType}</Badge><Badge tone={document.embedded ? "success" : "neutral"}>{document.embedded ? "Semantique" : "Texte"}</Badge></div></div>{onDelete ? <Button aria-label="Supprimer" className="h-9 px-2 text-danger" type="button" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button> : null}</div><p className="mt-2 line-clamp-2 text-xs text-muted">{document.content}</p></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md bg-panel-strong/40 p-3"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted">{label}</p></div>; }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="block text-sm font-medium">{label}<span className="mt-2 block">{children}</span></label>; }

const defaultModelByProvider: Record<AdminAiSettings["provider"], string> = {
  mistral: "mistral-small-2603",
  deepseek: "deepseek-v4-flash",
  openai: "gpt-5.4-mini",
  anthropic: "claude-sonnet-4-20250514",
};
