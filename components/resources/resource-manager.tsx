"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, BookOpen, Globe, LockKeyhole, Plus, Search } from "lucide-react";
import { archiveResourcePage, restoreArchivedResourcePage, saveResourcePage } from "@/app/(dashboard)/admin/resources/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createResourceDocument, resourceSlug } from "@/lib/resources";
import type { ResourcePage } from "@/types/resources";

export function ResourceManager({ pages, error }: { pages: ResourcePage[]; error?: string | null }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string; restoredId?: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ResourcePage | null>(null);
  const [updates, setUpdates] = useState<Record<string, ResourcePage>>({});
  const [refreshing, startRefresh] = useTransition();
  const pendingRef = useRef(false);
  const currentPages = pages.map((page) => updates[page.id] && updates[page.id].revision >= page.revision ? updates[page.id] : page);
  const query = search.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const archivedCount = currentPages.filter((page) => page.archived_at).length;
  const visible = currentPages.filter((page) => {
    const text = `${page.draft.title} ${page.draft.description} ${page.draft.category}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    if (!text.includes(query)) return false;
    if (filter === "archived") return Boolean(page.archived_at);
    if (page.archived_at) return false;
    return filter === "all" || (filter === "draft" ? !page.published_at : filter === "published" ? Boolean(page.published_at) : page.draft.visibility === filter);
  });

  async function createPage() {
    if (pendingRef.current || error) return;
    pendingRef.current = true;
    setPending("create");
    setMessage(null);
    try {
      const id = crypto.randomUUID();
      const document = createResourceDocument();
      document.title = "Nouvelle ressource";
      document.slug = `${resourceSlug(document.title)}-${id.slice(0, 8)}`;
      const result = await saveResourcePage({ id, document, expectedRevision: null });
      if (!result.ok) { setMessage({ kind: "error", text: result.message }); return; }
      router.push(`/resources/manage/${result.page.id}`);
    } catch {
      setMessage({ kind: "error", text: "La page n’a pas pu être créée. Vérifiez votre connexion et réessayez." });
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  async function changeArchive(page: ResourcePage, archive: boolean) {
    if (pendingRef.current || error) return;
    pendingRef.current = true;
    setPending(page.id);
    setMessage(null);
    try {
      const result = await (archive ? archiveResourcePage : restoreArchivedResourcePage)(page.id, page.revision);
      if (!result.ok) { setMessage({ kind: "error", text: result.message }); return; }
      setUpdates((previous) => ({ ...previous, [page.id]: result.page }));
      setArchiveTarget(null);
      setMessage({ kind: "success", text: result.message, restoredId: archive ? undefined : page.id });
    } catch {
      setMessage({ kind: "error", text: archive ? "L’archivage a échoué. La page reste inchangée ; réessayez." : "La restauration a échoué. La page reste dans les archives ; réessayez." });
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-accent">Ressources TaDiff</p>
          <h1 className="text-2xl font-semibold text-foreground">Des ressources à partager</h1>
          <p className="text-sm leading-relaxed text-muted">Composez des guides, partagez des documents et des liens. Pour chaque page, choisissez un accès public ou réservé aux membres.</p>
        </div>
        <Button type="button" disabled={Boolean(pending || error)} onClick={createPage}><Plus className="mr-2 size-4" aria-hidden="true" />{pending === "create" ? "Création…" : "Créer une page"}</Button>
      </header>
      {(error || message && !archiveTarget) ? <div role={error || message?.kind === "error" ? "alert" : "status"} className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-4 text-sm ${error || message?.kind === "error" ? "border-danger/30 bg-danger/5 text-danger" : "border-success/25 bg-success/5 text-foreground"}`}><p>{error || message?.text}</p>{error ? <Button variant="secondary" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "Chargement…" : "Réessayer le chargement"}</Button> : message?.restoredId ? <ButtonLink href={`/resources/manage/${message.restoredId}`} variant="secondary">Ouvrir la page restaurée</ButtonLink> : message?.kind === "success" && archivedCount > 0 ? <Button variant="ghost" onClick={() => setFilter("archived")}>Voir les archives</Button> : null}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Rechercher une page</span><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" aria-hidden="true" /><Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un titre, une catégorie…" /></label>
        <label className="sm:w-64"><span className="sr-only">Filtrer les pages</span><Select aria-label="Filtrer les pages" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Pages en cours</option><option value="published">Pages publiées</option><option value="draft">Brouillons</option><option value="public">Brouillon : accès public</option><option value="members">Brouillon : accès membres</option><option value="archived">Archives ({archivedCount})</option></Select></label>
      </div>
      {filter === "archived" ? <p className="text-sm text-muted">Les pages archivées et leurs fichiers ne sont plus visibles par les lecteurs. Restaurez une page pour la modifier et la publier à nouveau.</p> : null}
      {error ? null : visible.length ? <div className="divide-y divide-border rounded-lg border border-border bg-panel">
        {visible.map((page) => <article key={page.id} className="flex min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted"><span>{page.draft.category || "Sans catégorie"}</span><span aria-hidden="true">·</span><span className={page.archived_at ? "text-muted" : page.published_at ? "text-success" : "text-warning"}>{page.archived_at ? "Archivée" : page.published_at ? "Publiée" : "Brouillon"}</span><span className="inline-flex items-center gap-1">{page.published_at ? "Brouillon : " : ""}{page.draft.visibility === "public" ? <Globe className="size-3.5" aria-hidden="true" /> : <LockKeyhole className="size-3.5" aria-hidden="true" />}{page.draft.visibility === "public" ? "Public" : "Membres"}</span></div>
            <h2 className="break-words text-lg font-semibold">{page.draft.title || "Sans titre"}</h2>
            {page.draft.description ? <p className="line-clamp-2 break-words text-sm text-muted">{page.draft.description}</p> : null}
            <p className="text-xs text-muted">Modifiée le {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(page.updated_at))}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{page.archived_at ? <Button variant="secondary" disabled={Boolean(pending || error)} onClick={() => changeArchive(page, false)}><ArchiveRestore className="mr-2 size-4" aria-hidden="true" />{pending === page.id ? "Restauration…" : "Restaurer la page"}</Button> : <><ButtonLink href={`/resources/manage/${page.id}`} variant="secondary">Modifier la page</ButtonLink><Button variant="ghost" disabled={Boolean(pending || error)} onClick={() => { setMessage(null); setArchiveTarget(page); }} aria-label={`Archiver ${page.draft.title}`}><Archive className="mr-2 size-4" aria-hidden="true" />Archiver</Button></>}</div>
        </article>)}
      </div> : <div className="border-y border-border py-14 text-center"><BookOpen className="mx-auto mb-4 size-8 text-accent" aria-hidden="true" /><h2 className="text-lg font-semibold">{filter === "archived" && !search ? "Aucune page archivée" : currentPages.length ? "Aucune page ne correspond" : "Votre première ressource commence ici"}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">{filter === "archived" && !search ? "Les pages retirées de votre espace resteront disponibles ici." : currentPages.length ? "Essayez un autre mot ou un autre filtre." : "Ajoutez du texte, des images et des fichiers. La mise en page garde les couleurs de TaDiff."}</p>{currentPages.length ? <Button className="mt-4" variant="ghost" onClick={() => { setSearch(""); setFilter("all"); }}>Effacer les filtres</Button> : null}</div>}
      <Dialog open={Boolean(archiveTarget)} onClose={() => { if (!pending) setArchiveTarget(null); }} title="Archiver cette page ?" description="La page et ses fichiers seront retirés de la consultation. Vous pourrez la retrouver dans les archives et la restaurer en brouillon.">
        <p className="break-words font-semibold">{archiveTarget?.draft.title}</p>
        {message?.kind === "error" ? <p role="alert" className="mt-3 text-sm text-danger">{message.text}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={Boolean(pending)} onClick={() => setArchiveTarget(null)}>Annuler</Button><Button disabled={Boolean(pending)} onClick={() => archiveTarget && changeArchive(archiveTarget, true)}>{pending ? "Archivage…" : "Archiver la page"}</Button></div>
      </Dialog>
    </div>
  );
}
