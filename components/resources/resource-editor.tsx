/* eslint-disable @next/next/no-img-element -- Resource files use an authenticated endpoint without an optimizer cache. */
"use client";

/* THESIS: Compose useful resources directly on a page, with visible publishing controls.
 * OWN-WORLD: Existing TaDiff paper blue, white panels, royal blue actions, Inter typography.
 * STORY: Add a block, select its content, choose an audience, save a draft, publish deliberately.
 * FIRST VIEWPORT: Block palette left, white page center, Page/Bloc inspector right; actions above.
 * FORM: The user-approved visual editor extends TaDiff's current design system. */
import { memo, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ArrowDown, ArrowLeft, ArrowUp, Check, Columns2, Copy, Eye, FileText, Globe, GripVertical, Heading2, History, ImageIcon, Images, Link2, LockKeyhole, Monitor, PanelRight, Plus, Save, Smartphone, Trash2, Type, Undo2, Upload, Video } from "lucide-react";
import { getResourceRevisions, restoreResourceRevision, saveResourcePage, unpublishResourcePage } from "@/app/(dashboard)/admin/resources/actions";
import { ResourceArticle } from "@/components/resources/resource-article";
import { ResourceBlocks, resourceBlockPresentationClass } from "@/components/resources/resource-blocks";
import { ResourceDragArea, ResourceDropEnd, ResourceDropMarker, ResourcePaletteBlock } from "@/components/resources/resource-editor-drag";
import { AssetField, EditorField, ResourceBlockFields, ResourceMoveField } from "@/components/resources/resource-editor-fields";
import { duplicateResourceBlock, editResourceBlock, editResourceList, findResourceBlock, placeResourceBlock, resourceBlockCount, type BlockDestination } from "@/components/resources/editor-tree";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { allowedResourceUpload, createResourceBlock, RESOURCE_MAX_BLOCKS, RESOURCE_UPLOAD_MAX_BYTES, resourceAssetUrl, resourceDocumentSchema, resourceSlug, resourceUploadMime, validateResourceForPublication } from "@/lib/resources";
import type { ResourceAsset, ResourceBlock, ResourceBlockType, ResourceDocument, ResourcePage, ResourceRevision } from "@/types/resources";

const BLOCKS = [
  { type: "heading", label: "Titre", icon: Heading2 },
  { type: "text", label: "Texte", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "gallery", label: "Galerie", icon: Images },
  { type: "link", label: "Lien / bouton", icon: Link2 },
  { type: "file", label: "Document", icon: FileText },
  { type: "video", label: "Vidéo", icon: Video },
  { type: "columns", label: "2 colonnes", icon: Columns2 },
] as const;
const blockLabel = (type: ResourceBlockType) => BLOCKS.find((item) => item.type === type)!.label;
const serialize = (document: ResourceDocument) => JSON.stringify(document);
type Picker = { kind: "image" | "file"; apply: (asset: ResourceAsset) => void };
type Notice = { kind: "error" | "success"; text: string } | null;

// A field edit only rerenders that block's content, even on an 80-block page.
const ResourceBlockPreview = memo(function ResourceBlockPreview({ block }: { block: ResourceBlock }) {
  return <div className="pointer-events-none select-none" inert><ResourceBlocks blocks={[block]} preview /></div>;
});

function IconButton({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} className="inline-flex size-10 shrink-0 items-center justify-center rounded text-muted hover:bg-panel-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-35" {...props}>{children}</button>;
}

type BlockListProps = {
  blocks: ResourceBlock[];
  destination: BlockDestination;
  selected: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onChangeList: (destination: BlockDestination, edit: (list: ResourceBlock[]) => ResourceBlock[]) => void;
  onRemove: (id: string) => void;
  onDuplicate: (block: ResourceBlock, destination: BlockDestination) => void;
  onAdd: (destination: BlockDestination) => void;
};

function SortableBlock({ block, index, total, listProps }: { block: ResourceBlock; index: number; total: number; listProps: BlockListProps }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled: listProps.busy, data: { kind: "block", destination: listProps.destination, index, label: blockLabel(block.type) } });
  const selected = listProps.selected === block.id;
  function move(offset: number) { listProps.onChangeList(listProps.destination, (items) => arrayMove(items, index, index + offset)); }
  return <section ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`min-w-0 rounded-md border ${selected ? "border-accent ring-1 ring-accent" : "border-transparent hover:border-border"} ${isDragging ? "relative z-10 bg-panel opacity-75" : ""}`} aria-label={`Bloc ${blockLabel(block.type)} ${index + 1}`} data-resource-block={block.id}>
    <div className={`flex flex-wrap items-center justify-between gap-x-1 border-b px-1 ${selected ? "border-accent/20 bg-accent/5" : "border-border/60 bg-panel-strong/50"}`}>
      <div className="flex min-w-0 items-center"><button type="button" {...attributes} {...listeners} aria-label={`Déplacer le bloc ${blockLabel(block.type)} ${index + 1}`} className="inline-flex size-10 shrink-0 touch-none items-center justify-center rounded text-muted focus-visible:outline-2 focus-visible:outline-accent" disabled={listProps.busy}><GripVertical className="size-4" aria-hidden="true" /></button><button type="button" disabled={listProps.busy} onClick={() => listProps.onSelect(block.id)} className="min-h-10 truncate px-1 text-xs font-medium text-muted focus-visible:outline-2 focus-visible:outline-accent">{blockLabel(block.type)}</button></div>
      <div className="flex shrink-0 items-center">
        <IconButton label={`Monter le bloc ${index + 1}`} disabled={listProps.busy || index === 0} onClick={() => move(-1)}><ArrowUp className="size-3.5" aria-hidden="true" /></IconButton>
        <IconButton label={`Descendre le bloc ${index + 1}`} disabled={listProps.busy || index === total - 1} onClick={() => move(1)}><ArrowDown className="size-3.5" aria-hidden="true" /></IconButton>
        <IconButton label={`Dupliquer le bloc ${index + 1}`} disabled={listProps.busy} onClick={() => listProps.onDuplicate(block, listProps.destination)}><Copy className="size-3.5" aria-hidden="true" /></IconButton>
        <IconButton label={`Supprimer le bloc ${index + 1}`} disabled={listProps.busy} onClick={() => listProps.onRemove(block.id)}><Trash2 className="size-3.5" aria-hidden="true" /></IconButton>
      </div>
    </div>
    {block.type === "columns" ? <div data-resource-columns={block.id} className={`grid min-w-0 gap-6 ${resourceBlockPresentationClass(block)} ${block.ratio === "wide-left" ? "@[768px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : block.ratio === "wide-right" ? "@[768px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : "@[768px]:grid-cols-2"}`}>
      {block.columns.map((column, columnIndex) => <div key={columnIndex} className="min-w-0 space-y-2 rounded border border-dashed border-border p-2"><p className="px-1 text-xs text-muted">Colonne {columnIndex + 1}</p><BlockList {...listProps} blocks={column} destination={{ parentId: block.id, column: columnIndex as 0 | 1 }} /></div>)}
    </div> : <div role="button" tabIndex={listProps.busy ? -1 : 0} aria-label={`Modifier le bloc ${blockLabel(block.type)} ${index + 1}`} onClick={() => !listProps.busy && listProps.onSelect(block.id)} onKeyDown={(event) => { if (!listProps.busy && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); listProps.onSelect(block.id); } }} className="cursor-pointer rounded-b p-4 focus-visible:outline-2 focus-visible:outline-accent"><ResourceBlockPreview block={block} /></div>}
  </section>;
}

function BlockList(props: BlockListProps) {
  return <div className="min-w-0"><SortableContext items={props.blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>{props.blocks.map((block, index) => <div key={block.id}><ResourceDropMarker destination={props.destination} index={index} /><SortableBlock block={block} index={index} total={props.blocks.length} listProps={props} /></div>)}</SortableContext><ResourceDropEnd destination={props.destination} index={props.blocks.length} disabled={props.busy}><Button variant="ghost" disabled={props.busy} className="w-full border border-dashed border-border text-xs" onClick={() => props.onAdd(props.destination)}><Plus className="mr-1 size-4" aria-hidden="true" />{props.destination ? "Ajouter dans cette colonne" : "Ajouter un bloc"}</Button></ResourceDropEnd></div>;
}

export function ResourceEditor({ initialPage, initialAssets }: { initialPage: ResourcePage; initialAssets: ResourceAsset[] }) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [document, setDocument] = useState(initialPage.draft);
  const [savedDocument, setSavedDocument] = useState(() => serialize(initialPage.draft));
  const [assets, setAssets] = useState(initialAssets);
  const [selected, setSelected] = useState<string | null>(null);
  const [destination, setDestination] = useState<BlockDestination>(null);
  const [inspector, setInspector] = useState<"page" | "block">("page");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [conflict, setConflict] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<ResourceRevision[]>([]);
  const [undo, setUndo] = useState<ResourceDocument | null>(null);
  const [publishDialog, setPublishDialog] = useState(false);
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const allowLeave = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const paletteRef = useRef<HTMLElement>(null);
  const shortcutSave = useRef<() => void>(() => {});
  const dirty = savedDocument !== serialize(document);
  const selectedBlock = findResourceBlock(document.blocks, selected);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const observer = new ResizeObserver(() => rootRef.current?.style.setProperty("--resource-toolbar-height", `${toolbar.getBoundingClientRect().height}px`));
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    shortcutSave.current = () => { if (dirty && !busyRef.current && !page.archived_at) void save(); };
  });

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        shortcutSave.current();
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) { if (!allowLeave.current) { event.preventDefault(); event.returnValue = ""; } }
    function beforeNavigate(event: MouseEvent) {
      if (allowLeave.current || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.hash && anchor.pathname === window.location.pathname) return;
      if (!window.confirm("Cette page contient des modifications non enregistrées. Quitter sans les enregistrer ?")) { event.preventDefault(); event.stopPropagation(); }
      else allowLeave.current = true;
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.document.addEventListener("click", beforeNavigate, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.document.removeEventListener("click", beforeNavigate, true); };
  }, [dirty]);

  function changeDocument(next: ResourceDocument) { setDocument(next); setNotice(null); }
  function changeList(target: BlockDestination, edit: (list: ResourceBlock[]) => ResourceBlock[]) { changeDocument({ ...document, blocks: editResourceList(document.blocks, target, edit) }); }
  function jumpTo(target: RefObject<HTMLElement | null>, focusSelector?: string) {
    const element = target.current;
    if (!element) return;
    element.scrollIntoView({ block: "start" });
    (focusSelector ? element.querySelector<HTMLElement>(focusSelector) : element)?.focus({ preventScroll: true });
  }
  function selectBlock(id: string) {
    setSelected(id); setInspector("block");
    window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.scrollTop = 0;
      if (window.innerWidth < 1280) panel.scrollIntoView({ block: "start" });
      panel.querySelector<HTMLElement>("input, textarea, select, fieldset button")?.focus({ preventScroll: true });
    });
  }
  function requestAdd(target: BlockDestination) { setDestination(target); jumpTo(paletteRef, "button:not([disabled])"); }
  function addBlock(type: ResourceBlockType) {
    if (busyRef.current || resourceBlockCount(document.blocks) >= RESOURCE_MAX_BLOCKS) return;
    const block = createResourceBlock(type);
    const parent = destination ? findResourceBlock(document.blocks, destination.parentId) : null;
    const list = parent?.type === "columns" && destination ? parent.columns[destination.column] : document.blocks;
    const blocks = placeResourceBlock(document.blocks, block, destination, list.length);
    if (blocks === document.blocks) { setNotice({ kind: "error", text: "Cet emplacement ne peut pas accueillir un niveau de colonnes supplémentaire." }); return; }
    changeDocument({ ...document, blocks });
    selectBlock(block.id);
  }
  function removeBlock(id: string) {
    const removed = findResourceBlock(document.blocks, id);
    if (!removed) return;
    setUndo(document);
    changeDocument({ ...document, blocks: editResourceBlock(document.blocks, id, () => null) });
    if (selected === id || findResourceBlock([removed], selected)) { setSelected(null); setInspector("page"); }
    if (destination?.parentId === id) setDestination(null);
    setNotice({ kind: "success", text: "Bloc retiré. Vous pouvez annuler cette suppression." });
  }
  function duplicateBlock(block: ResourceBlock, target: BlockDestination) {
    if (resourceBlockCount(document.blocks) + resourceBlockCount([block]) > RESOURCE_MAX_BLOCKS) { setNotice({ kind: "error", text: "Cette page contient déjà trop de blocs. La limite est de 80." }); return; }
    const copy = duplicateResourceBlock(block);
    changeList(target, (blocks) => { const index = blocks.findIndex((item) => item.id === block.id); return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]; });
    selectBlock(copy.id);
  }
  function acceptSaved(next: ResourcePage) { setPage(next); setDocument(next.draft); setSavedDocument(serialize(next.draft)); setConflict(false); setUndo(null); }
  async function save(publish = false) {
    if (busyRef.current || page.archived_at) return false;
    const parsed = resourceDocumentSchema.safeParse(document);
    const validation = !parsed.success ? parsed.error.issues[0]?.message || "Vérifiez les champs de la page." : publish ? validateResourceForPublication(parsed.data) : null;
    if (validation) { setNotice({ kind: "error", text: validation }); return false; }
    busyRef.current = true; setBusy(true); setNotice(null);
    try {
      const result = await saveResourcePage({ id: page.id, document, expectedRevision: page.revision, publish });
      if (!result.ok) { setNotice({ kind: "error", text: result.message }); setConflict(Boolean(result.conflict)); return false; }
      acceptSaved(result.page); setNotice({ kind: "success", text: result.message }); return true;
    } catch { setNotice({ kind: "error", text: "L’enregistrement a échoué. Vos modifications sont conservées ici ; vérifiez votre connexion et réessayez." }); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function upload(file: File) {
    if (!picker || busyRef.current) return;
    setUploadError(null);
    if (file.size > RESOURCE_UPLOAD_MAX_BYTES) { setUploadError("Ce fichier dépasse 4 Mo. Choisissez une version plus légère."); return; }
    if (!allowedResourceUpload(file.name, file.type, file.size)) { setUploadError("Ce fichier n’est pas accepté. Choisissez un fichier JPG, PNG, WebP, GIF, PDF, DOCX, XLSX, CSV ou TXT non vide, avec un nom de moins de 200 caractères."); return; }
    if (picker.kind === "image" && !resourceUploadMime(file.name, file.type)?.startsWith("image/")) { setUploadError("Choisissez une image JPG, PNG, WebP ou GIF."); return; }
    const currentPicker = picker;
    if (dirty && !await save()) { setUploadError("Le brouillon doit être enregistré avant l’ajout d’un fichier. Vérifiez les champs de la page puis réessayez."); return; }
    busyRef.current = true; setBusy(true);
    try {
      const body = new FormData(); body.set("pageId", page.id); body.set("file", file);
      const response = await fetch("/api/resources/assets", { method: "POST", body });
      const result = await response.json() as { ok: boolean; asset?: ResourceAsset; message?: string };
      if (!response.ok || !result.ok || !result.asset) { setUploadError(result.message || "Le fichier n’a pas pu être ajouté. Réessayez."); return; }
      setAssets((previous) => [result.asset!, ...previous]); currentPicker.apply(result.asset); setPicker(null);
      setNotice({ kind: "success", text: "Fichier ajouté. Enregistrez le brouillon pour conserver son emplacement." });
    } catch { setUploadError("L’envoi a été interrompu. Votre page est conservée ; réessayez avec le même fichier."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function loadHistory() {
    setHistoryOpen(true); setHistoryLoading(true); setHistoryError(null);
    try { const result = await getResourceRevisions(page.id); setRevisions(result.data); setHistoryError(result.error); }
    catch { setHistoryError("L’historique n’a pas pu être chargé. Réessayez."); }
    finally { setHistoryLoading(false); }
  }
  async function restore() {
    if (!restoreId || busyRef.current) return;
    busyRef.current = true; setBusy(true); setHistoryError(null);
    try {
      const result = await restoreResourceRevision(page.id, restoreId, page.revision);
      if (!result.ok) { setHistoryError(result.message); return; }
      acceptSaved(result.page); setSelected(null); setInspector("page"); setDestination(null); setHistoryOpen(false); setRestoreId(null); setNotice({ kind: "success", text: result.message });
    } catch { setHistoryError("La restauration a échoué. Le brouillon actuel est conservé ; réessayez."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function unpublish() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const result = await unpublishResourcePage(page.id, page.revision);
      if (!result.ok) { setNotice({ kind: "error", text: result.message }); setConflict(Boolean(result.conflict)); return; }
      // Unpublishing must not replace edits that have not been saved yet.
      setPage(result.page); setSavedDocument(serialize(result.page.draft)); setNotice({ kind: "success", text: result.message }); setUnpublishDialog(false);
    } catch { setNotice({ kind: "error", text: "La page n’a pas pu être retirée. Réessayez." }); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function applyTemplate(kind: "guide" | "links") {
    const heading = createResourceBlock("heading");
    const text = createResourceBlock("text");
    if (heading.type === "heading") heading.text = kind === "guide" ? "Pour commencer" : "Les liens utiles";
    if (text.type === "text") text.text = kind === "guide" ? "Présentez les objectifs de ce guide et les informations à préparer." : "Présentez votre sélection de ressources et à qui elle s’adresse.";
    changeDocument({ ...document, blocks: [heading, text, createResourceBlock(kind === "guide" ? "file" : "link")] });
  }
  function chooseAsset(kind: Picker["kind"], apply: Picker["apply"]) { setUploadError(null); setPicker({ kind, apply }); }
  const chosenAssets = assets.filter((asset) => picker?.kind !== "image" || asset.mime_type.startsWith("image/"));
  if (page.archived_at) return <section className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-panel p-8"><Archive className="size-7 text-muted" aria-hidden="true" /><h1 className="text-2xl font-semibold">Cette page est archivée</h1><p className="text-sm leading-relaxed text-muted">Restaurez-la depuis les archives pour retrouver son contenu dans l’éditeur.</p><ButtonLink href="/resources/manage" variant="secondary">Revenir aux ressources</ButtonLink></section>;

  return <div ref={rootRef} className="min-w-0 space-y-4" aria-busy={busy}>
    <header ref={toolbarRef} data-editor-toolbar className="sticky top-0 z-30 space-y-2 border-b border-border bg-background py-3 sm:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Toutes les ressources" title="Toutes les ressources" className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-panel text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent" disabled={busy} onClick={() => { if (dirty && !window.confirm("Quitter sans enregistrer les modifications de cette page ?")) return; allowLeave.current = true; router.push("/resources/manage"); }}><ArrowLeft className="size-4" aria-hidden="true" /></button><div className="min-w-0 space-y-1"><h1 className="text-xl font-semibold sm:text-2xl">Composer une ressource</h1><p className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className={dirty ? "text-warning" : "text-success"}>{dirty ? "Modifications non enregistrées" : "Brouillon enregistré"}</span><span className="hidden sm:inline" aria-hidden="true">·</span><span className="hidden sm:inline">{page.published_at ? "Une version est publiée" : "Cette page n’est pas encore publiée"}</span></p></div></div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="ghost" disabled={busy} onClick={loadHistory} aria-label="Historique" title="Historique" className="px-3"><History className="size-4 sm:mr-1.5" aria-hidden="true" /><span className="hidden sm:inline">Historique</span></Button><Button variant="secondary" disabled={busy} onClick={() => setPreview(true)} aria-label="Aperçu" title="Aperçu" className="px-3"><Eye className="size-4 sm:mr-1.5" aria-hidden="true" /><span className="hidden sm:inline">Aperçu</span></Button><Button variant="secondary" disabled={busy || !dirty} onClick={() => save()} aria-keyshortcuts="Control+s Meta+s" title="Enregistrer le brouillon · Ctrl ou ⌘ + S" className="px-3"><Save className="mr-1.5 size-4" aria-hidden="true" />{busy ? "En cours…" : "Enregistrer"}</Button><Button disabled={busy} className="px-3" onClick={() => { const validation = validateResourceForPublication(document); if (validation) { setNotice({ kind: "error", text: validation }); return; } setPublishDialog(true); }}>Publier<span className="hidden sm:inline">{page.published_at ? " les modifications" : ""}</span></Button></div>
      </div>
      <nav aria-label="Zones de l’éditeur" className="flex flex-wrap gap-1 border-t border-border pt-2 xl:hidden"><Button variant="ghost" className="min-h-9 px-2 py-1 text-xs" onClick={() => requestAdd(destination)}><Plus className="mr-1 size-3.5" aria-hidden="true" />Blocs</Button><Button variant="ghost" className="min-h-9 px-2 py-1 text-xs" onClick={() => jumpTo(canvasRef)}><FileText className="mr-1 size-3.5" aria-hidden="true" />Voir la page</Button><Button variant="ghost" className="min-h-9 px-2 py-1 text-xs" onClick={() => jumpTo(panelRef, "input, textarea, select")}><PanelRight className="mr-1 size-3.5" aria-hidden="true" />Réglages</Button></nav>
    </header>
    {notice ? <div role={notice.kind === "error" ? "alert" : "status"} className={`flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm ${notice.kind === "error" ? "border-danger/30 bg-danger/5 text-danger" : "border-success/25 bg-success/5 text-foreground"}`}><span className="min-w-0 flex-1">{notice.text}</span>{undo ? <Button variant="ghost" disabled={busy} onClick={() => { changeDocument(undo); setUndo(null); setSelected(null); setInspector("page"); }}><Undo2 className="mr-1 size-4" aria-hidden="true" />Annuler la suppression</Button> : null}{conflict ? <Button variant="secondary" onClick={() => { if (window.confirm("Recharger la version enregistrée remplacera vos modifications locales. Continuer ?")) { allowLeave.current = true; window.location.reload(); } }}>Recharger la version enregistrée</Button> : null}</div> : null}
    <ResourceDragArea blocks={document.blocks} busy={busy} onChange={(blocks) => changeDocument({ ...document, blocks })} onSelect={selectBlock} onRejected={() => setNotice({ kind: "error", text: "Ce déplacement dépasse la limite de deux niveaux de colonnes ou de 80 blocs. Votre contenu est conservé." })}>
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[176px_minmax(0,1fr)_260px]">
      <aside ref={paletteRef} aria-label="Ajouter des blocs" className="min-w-0 rounded-lg border border-border bg-panel p-3 [scroll-margin-top:calc(var(--resource-toolbar-height,10rem)+1rem)] xl:sticky xl:[top:calc(var(--resource-toolbar-height,10rem)+1rem)]">
        <h2 className="mb-3 px-1 text-sm font-semibold sm:mb-0">Ajouter un bloc</h2><p className="mb-3 mt-1 px-1 text-xs leading-relaxed text-muted">Glissez dans la page, ou cliquez pour ajouter.</p>
        {destination ? <div className="mb-3 rounded bg-panel-strong p-2 text-xs"><p>Ajout dans la colonne {destination.column + 1}</p><button type="button" onClick={() => setDestination(null)} className="mt-1 min-h-9 font-medium text-accent underline">Revenir à la page</button></div> : null}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 xl:grid-cols-2">{BLOCKS.map(({ type, label, icon: Icon }) => <ResourcePaletteBlock key={type} type={type} label={label} disabled={busy || resourceBlockCount(document.blocks) >= RESOURCE_MAX_BLOCKS} onAdd={() => addBlock(type)}><Icon className="size-4 xl:size-5" aria-hidden="true" /></ResourcePaletteBlock>)}</div>
        <p className="mt-4 hidden px-1 text-xs leading-relaxed text-muted xl:block">La ligne bleue indique où déposer le bloc. Sur écran tactile, maintenez avant de glisser.</p>
      </aside>
      <section ref={canvasRef} tabIndex={-1} className="min-w-0 space-y-3 outline-none [scroll-margin-top:calc(var(--resource-toolbar-height,10rem)+1rem)]" aria-label="Composition de la page">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">Votre page · {resourceBlockCount(document.blocks)} blocs</p><div className="flex items-center rounded-md border border-border bg-panel p-0.5" aria-label="Format de l’aperçu"><IconButton label="Format ordinateur" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor className={`size-4 ${!mobile ? "text-accent" : ""}`} aria-hidden="true" /></IconButton><IconButton label="Format téléphone" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone className={`size-4 ${mobile ? "text-accent" : ""}`} aria-hidden="true" /></IconButton></div></div>
        <div data-editor-canvas className={`@container mx-auto min-w-0 rounded-lg border border-border bg-panel p-4 sm:p-6 ${mobile ? "max-w-[390px]" : "w-full"}`}>
          <button type="button" disabled={busy} onClick={() => { setInspector("page"); window.requestAnimationFrame(() => jumpTo(panelRef, "input")); }} className="mb-6 block w-full min-w-0 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" aria-label="Modifier le titre et les réglages de la page">
            <span className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-accent"><span>{document.category || "Votre catégorie"}</span><span className="inline-flex items-center gap-1 rounded bg-panel-strong px-2 py-1 text-muted">{document.visibility === "public" ? <Globe className="size-3" aria-hidden="true" /> : <LockKeyhole className="size-3" aria-hidden="true" />}{document.visibility === "public" ? "Public" : "Membres TaDiff"}</span></span>
            <span className="block break-words text-3xl font-semibold leading-tight tracking-tight">{document.title || "Le titre de votre page"}</span>{document.description ? <span className="mt-3 block whitespace-pre-line break-words text-sm leading-relaxed text-muted">{document.description}</span> : null}
            {document.coverAssetId ? <img src={resourceAssetUrl(document.coverAssetId)} alt="" className="mt-5 max-h-64 w-full rounded-md object-cover" /> : null}
          </button>
          {document.blocks.length === 0 ? <div className="mb-6 space-y-4 border-y border-dashed border-border py-8"><h2 className="text-lg font-semibold">Composez votre première page</h2><p className="text-sm leading-relaxed text-muted">Choisissez un bloc à gauche, ou commencez avec une structure à remplir.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => applyTemplate("guide")}>Guide pratique</Button><Button variant="secondary" disabled={busy} onClick={() => applyTemplate("links")}>Sélection de liens</Button></div></div> : null}
          <BlockList blocks={document.blocks} destination={null} selected={selected} busy={busy} onSelect={selectBlock} onChangeList={changeList} onRemove={removeBlock} onDuplicate={duplicateBlock} onAdd={requestAdd} />
        </div>
      </section>
      <aside ref={panelRef} className="min-w-0 rounded-lg border border-border bg-panel [scroll-margin-top:calc(var(--resource-toolbar-height,10rem)+1rem)] xl:sticky xl:max-h-[calc(100dvh-var(--resource-toolbar-height,10rem)-2rem)] xl:overflow-y-auto xl:[top:calc(var(--resource-toolbar-height,10rem)+1rem)]" aria-label="Réglages de la ressource">
        <div className="flex border-b border-border" aria-label="Choix des réglages"><button type="button" aria-pressed={inspector === "page"} onClick={() => setInspector("page")} className={`min-h-12 flex-1 border-b-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent ${inspector === "page" ? "border-accent text-accent" : "border-transparent text-muted"}`}>Page</button><button type="button" aria-pressed={inspector === "block"} disabled={!selectedBlock} onClick={() => setInspector("block")} className={`min-h-12 flex-1 border-b-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${inspector === "block" ? "border-accent text-accent" : "border-transparent text-muted"}`}>Bloc</button></div>
        <fieldset disabled={busy} className="min-w-0 space-y-5 p-4">
          {inspector === "block" && selectedBlock ? <><h2 className="text-sm font-semibold">{blockLabel(selectedBlock.type)}</h2><ResourceMoveField block={selectedBlock} blocks={document.blocks} onMove={(blocks) => changeDocument({ ...document, blocks })} /><ResourceBlockFields key={selectedBlock.id} block={selectedBlock} assets={assets} onChange={(next) => { setDocument((current) => ({ ...current, blocks: editResourceBlock(current.blocks, next.id, () => next) })); setNotice(null); }} onChooseAsset={chooseAsset} /></> : <>
            <EditorField label="Titre de la page"><Input value={document.title} maxLength={180} onChange={(event) => changeDocument({ ...document, title: event.target.value })} /></EditorField>
            <EditorField label="Adresse de la page" hint="Lettres minuscules, chiffres et tirets. Changer l’adresse d’une page publiée rend son ancien lien indisponible."><Input value={document.slug} maxLength={100} onChange={(event) => changeDocument({ ...document, slug: event.target.value })} /></EditorField>
            <button type="button" onClick={() => changeDocument({ ...document, slug: resourceSlug(document.title) })} className="min-h-9 text-xs font-medium text-accent underline">Créer l’adresse à partir du titre</button>
            <EditorField label="Résumé"><Textarea value={document.description} maxLength={500} rows={3} onChange={(event) => changeDocument({ ...document, description: event.target.value })} /></EditorField>
            <EditorField label="Catégorie"><Input value={document.category} maxLength={80} list="resource-categories" onChange={(event) => changeDocument({ ...document, category: event.target.value })} /><datalist id="resource-categories"><option value="Guides pratiques" /><option value="Financements" /><option value="Diffusion" /><option value="Modèles et documents" /><option value="Vie de compagnie" /></datalist></EditorField>
            <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Qui peut voir cette page ?</legend>{([{ value: "public", label: "Tout le monde", description: "Accessible sans connexion.", icon: Globe }, { value: "members", label: "Membres TaDiff", description: "Compagnies connectées avec un accès actif.", icon: LockKeyhole }] as const).map(({ value, label, description, icon: Icon }) => <label key={value} className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-3 ${document.visibility === value ? "border-accent bg-accent/5" : "border-border"}`}><input type="radio" name="resource-visibility" value={value} checked={document.visibility === value} onChange={() => changeDocument({ ...document, visibility: value })} className="mt-1 size-4 shrink-0 accent-accent" /><span className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-3.5" aria-hidden="true" />{label}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span></span></label>)}</fieldset>
            <p className="text-xs leading-relaxed text-muted">Le choix est appliqué lors de la publication. Les fichiers joints suivent l’accès de la page.</p>
            <AssetField label="Image de couverture" assetId={document.coverAssetId} assets={assets} onChoose={() => chooseAsset("image", (asset) => { setDocument((current) => ({ ...current, coverAssetId: asset.id })); setNotice(null); })} onRemove={() => changeDocument({ ...document, coverAssetId: null })} />
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={document.featured} onChange={(event) => changeDocument({ ...document, featured: event.target.checked })} className="size-4 accent-accent" />Mettre en avant dans les ressources</label>
            {page.published_at ? <div className="border-t border-border pt-3"><p className="mb-2 text-xs text-muted">Votre brouillon reste séparé de la version publiée.</p><Button variant="ghost" className="w-full" onClick={() => setUnpublishDialog(true)}>Retirer la page publiée</Button></div> : null}
          </>}
        </fieldset>
      </aside>
    </div>
    </ResourceDragArea>
    <Dialog open={preview} onClose={() => setPreview(false)} title="Aperçu de la page" description={`Aperçu du brouillon · ${document.visibility === "public" ? "accessible à tout le monde après publication" : "réservé aux membres après publication"}. Les liens et téléchargements sont désactivés dans cet aperçu.`} className="max-w-6xl"><div className="mb-4 flex justify-end gap-2"><Button variant={mobile ? "secondary" : "primary"} onClick={() => setMobile(false)}><Monitor className="mr-2 size-4" aria-hidden="true" />Ordinateur</Button><Button variant={mobile ? "primary" : "secondary"} onClick={() => setMobile(true)}><Smartphone className="mr-2 size-4" aria-hidden="true" />Téléphone</Button></div><div className={`@container mx-auto min-w-0 ${mobile ? "max-w-[390px]" : ""}`}><ResourceArticle resource={{ id: page.id, document, updated_at: page.updated_at, published_at: page.published_at || page.updated_at }} preview /></div></Dialog>
    <Dialog open={Boolean(picker)} onClose={() => { if (!busy) setPicker(null); }} title={picker?.kind === "image" ? "Choisir une image" : "Choisir un fichier"} description="Les fichiers sont rattachés à cette page. Un brouillon n’est visible que par les personnes autorisées à gérer les ressources." className="max-w-3xl">
      <div className="space-y-5"><label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-panel-strong p-4 text-center ${busy ? "opacity-60" : "hover:border-accent"}`}><Upload className="size-6 text-accent" aria-hidden="true" /><span className="text-sm font-semibold">{busy ? "Envoi en cours…" : "Ajouter un fichier depuis cet appareil"}</span><span className="text-xs text-muted">{picker?.kind === "image" ? "JPG, PNG, WebP ou GIF" : "Images, PDF, DOCX, XLSX, CSV ou TXT"} · 4 Mo maximum</span><input aria-label="Fichier à ajouter" type="file" disabled={busy} accept={picker?.kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : ".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.xlsx,.txt,.csv"} className="max-w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-panel file:px-3 file:py-2 file:font-medium" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></label>
        {uploadError ? <p role="alert" className="text-sm text-danger">{uploadError}</p> : null}
        <h3 className="text-sm font-semibold">Déjà ajoutés à cette page</h3>{chosenAssets.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{chosenAssets.map((asset) => <button type="button" disabled={busy} key={asset.id} onClick={() => { picker?.apply(asset); setPicker(null); }} className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3 text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-accent">{asset.mime_type.startsWith("image/") ? <img src={resourceAssetUrl(asset.id)} alt="" className="h-24 w-full rounded object-contain" /> : <FileText className="mx-auto my-6 size-10 text-accent" aria-hidden="true" />}<span className="w-full break-words text-xs font-medium">{asset.name}</span><span className="text-xs text-muted">{new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(asset.size / 1024)} Ko</span></button>)}</div> : <p className="py-3 text-sm text-muted">Aucun fichier pour le moment. Ajoutez votre premier fichier ci-dessus.</p>}</div>
    </Dialog>
    <Dialog open={publishDialog} onClose={() => { if (!busy) setPublishDialog(false); }} title={page.published_at ? "Publier les modifications ?" : "Publier cette ressource ?"} description={document.visibility === "public" ? "La page et ses fichiers seront accessibles à tout le monde, sans connexion, via leur lien." : "La page et ses fichiers seront accessibles aux membres des compagnies TaDiff avec un accès actif."}><p className="break-words font-medium">{document.title}</p><p className="mt-2 break-all text-sm text-muted">/ressources/{document.slug}</p><div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setPublishDialog(false)}>Continuer à modifier</Button><Button disabled={busy} onClick={async () => { setPublishDialog(false); await save(true); }}><Check className="mr-2 size-4" aria-hidden="true" />{document.visibility === "public" ? "Publier pour tout le monde" : "Publier pour les membres"}</Button></div></Dialog>
    <Dialog open={unpublishDialog} onClose={() => { if (!busy) setUnpublishDialog(false); }} title="Retirer la page publiée ?" description="La page et ses fichiers ne seront plus accessibles aux lecteurs. Votre brouillon sera conservé pour une prochaine publication."><div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setUnpublishDialog(false)}>Annuler</Button><Button disabled={busy} onClick={unpublish}>{busy ? "Retrait…" : "Retirer la page"}</Button></div></Dialog>
    <Dialog open={historyOpen} onClose={() => { if (!busy) { setHistoryOpen(false); setRestoreId(null); } }} title="Historique des brouillons" description="Restaurer une version remplace le brouillon. La version publiée reste inchangée jusqu’à votre prochaine publication.">
      {historyLoading ? <p role="status" className="py-6 text-sm text-muted">Chargement des versions…</p> : null}{historyError ? <div role="alert" className="space-y-2 text-sm text-danger"><p>{historyError}</p><Button variant="secondary" disabled={busy} onClick={loadHistory}>Réessayer</Button></div> : null}
      {!historyLoading && !historyError && revisions.length === 0 ? <p className="py-6 text-sm text-muted">L’historique apparaîtra après le premier enregistrement.</p> : null}
      <div className="divide-y divide-border">{revisions.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">Version {revision.revision} · {revision.document.title}</p><p className="text-xs text-muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(revision.created_at))}</p></div><Button variant="secondary" disabled={busy} onClick={() => setRestoreId(revision.id)}>Restaurer</Button></div>)}</div>
      {restoreId ? <div className="mt-4 space-y-3 border-t border-border pt-4"><p className="text-sm">{dirty ? "Vos modifications non enregistrées seront remplacées par cette version." : "Ce brouillon sera remplacé par la version choisie."}</p><div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setRestoreId(null)}>Annuler</Button><Button disabled={busy} onClick={restore}>{busy ? "Restauration…" : "Confirmer la restauration"}</Button></div></div> : null}
    </Dialog>
  </div>;
}
