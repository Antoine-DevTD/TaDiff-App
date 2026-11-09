import { z } from "zod";
import type { ResourceBlock, ResourceBlockType, ResourceDocument } from "@/types/resources";

// The app relays private files through Vercel Functions (4.5 MB including the envelope).
export const RESOURCE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const RESOURCE_MAX_BLOCKS = 80;
const identifier = z.string().uuid("Identifiant de ressource invalide.");
const shortText = z.string().trim().max(240, "Ce texte est trop long.");
const tone = z.enum(["plain", "soft", "accent"]);
const image = { assetId: identifier.nullable(), alt: shortText, caption: z.string().trim().max(500) };
const base = { id: identifier, tone };

/** Only links to published resources or explicit web URLs can leave a block. */
export function safeResourceLink(value: string): string | null {
  const input = value.trim();
  if (!input || /[\u0000-\u0020\u007f\\]/.test(input)) return null;
  if (/^\/ressources\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname) return null;
    return url.href;
  } catch { return null; }
}

export function resourceVideoEmbed(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(?:embed|shorts)\/([\w-]+)$/.exec(url.pathname)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const match = /^\/(?:video\/)?([0-9]{1,12})$/.exec(url.pathname);
      return match ? `https://player.vimeo.com/video/${match[1]}?dnt=1` : null;
    }
    return null;
  } catch { return null; }
}

const draftLink = z.string().trim().max(2000).refine((value) => !value || safeResourceLink(value) !== null, "Utilisez un lien http(s) ou une page /ressources/…");
const draftVideo = z.string().trim().max(2000).refine((value) => !value || resourceVideoEmbed(value) !== null, "Utilisez un lien vidéo YouTube ou Vimeo en https.");
const blockSchema: z.ZodType<ResourceBlock> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("heading"), text: shortText, level: z.union([z.literal(2), z.literal(3)]) }).strict(),
  z.object({ ...base, type: z.literal("text"), text: z.string().max(20000) }).strict(),
  z.object({ ...base, type: z.literal("image"), ...image }).strict(),
  z.object({ ...base, type: z.literal("gallery"), images: z.array(z.object(image).strict()).max(12) }).strict(),
  z.object({ ...base, type: z.literal("link"), label: shortText, url: draftLink }).strict(),
  z.object({ ...base, type: z.literal("file"), assetId: identifier.nullable(), label: shortText, description: z.string().trim().max(500) }).strict(),
  z.object({ ...base, type: z.literal("video"), url: draftVideo, title: shortText }).strict(),
  z.object({ ...base, type: z.literal("columns"), ratio: z.enum(["equal", "wide-left", "wide-right"]), columns: z.tuple([z.array(blockSchema).max(80), z.array(blockSchema).max(80)]) }).strict(),
]));

// Reject hostile depth and oversized input before entering the recursive schema.
function boundedTree(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  try { if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 450000) return false; }
  catch { return false; }
  const blocks = (value as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return false;
  const pending = blocks.map((block: unknown) => ({ block, depth: 0 }));
  let count = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++count > RESOURCE_MAX_BLOCKS || item.depth > 2) return false;
    if (item.block && typeof item.block === "object" && "columns" in item.block) {
      const columns = (item.block as { columns: unknown }).columns;
      if (!Array.isArray(columns) || columns.length !== 2) return false;
      for (const column of columns) {
        if (!Array.isArray(column) || column.length > RESOURCE_MAX_BLOCKS) return false;
        for (const child of column) pending.push({ block: child, depth: item.depth + 1 });
      }
    }
  }
  return true;
}

const documentShape = z.object({
  version: z.literal(1),
  title: z.string().trim().min(1, "Donnez un titre à la page.").max(180),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "L’adresse doit contenir des lettres minuscules, chiffres et tirets."),
  description: z.string().trim().max(500),
  category: z.string().trim().min(1, "Choisissez une catégorie.").max(80),
  visibility: z.enum(["public", "members"]),
  featured: z.boolean(),
  coverAssetId: identifier.nullable(),
  blocks: z.array(blockSchema).max(RESOURCE_MAX_BLOCKS),
}).strict().superRefine((doc, ctx) => {
  const seen = new Set<string>();
  visitResourceBlocks(doc.blocks, (block) => {
    if (seen.has(block.id)) ctx.addIssue({ code: "custom", message: "Chaque bloc doit avoir un identifiant distinct.", path: ["blocks"] });
    seen.add(block.id);
  });
});

export const resourceDocumentSchema = z.unknown().superRefine((value, ctx) => {
  if (!boundedTree(value)) ctx.addIssue({ code: "custom", message: "La page est trop volumineuse : limitez le texte, les blocs (80 maximum) et les niveaux de colonnes (deux maximum).", fatal: true });
}).pipe(documentShape);

export function resourceSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90).replace(/-$/, "");
}

export function createResourceDocument(): ResourceDocument {
  return { version: 1, title: "Nouvelle ressource", slug: "nouvelle-ressource", description: "", category: "Guides pratiques", visibility: "members", featured: false, coverAssetId: null, blocks: [] };
}

export function createResourceBlock(type: ResourceBlockType): ResourceBlock {
  const common = { id: crypto.randomUUID(), tone: "plain" as const };
  switch (type) {
    case "heading": return { ...common, type, text: "Nouveau titre", level: 2 };
    case "text": return { ...common, type, text: "Votre texte…" };
    case "image": return { ...common, type, assetId: null, alt: "", caption: "" };
    case "gallery": return { ...common, type, images: [] };
    case "link": return { ...common, type, label: "En savoir plus", url: "" };
    case "file": return { ...common, type, assetId: null, label: "Télécharger le document", description: "" };
    case "video": return { ...common, type, url: "", title: "" };
    case "columns": return { ...common, type, ratio: "equal", columns: [[], []] };
  }
}

export function visitResourceBlocks(blocks: ResourceBlock[], visit: (block: ResourceBlock) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.type === "columns") for (const column of block.columns) visitResourceBlocks(column, visit);
  }
}

export function resourceAssetIds(doc: ResourceDocument): string[] {
  const ids = new Set<string>();
  if (doc.coverAssetId) ids.add(doc.coverAssetId);
  visitResourceBlocks(doc.blocks, (block) => {
    if ((block.type === "image" || block.type === "file") && block.assetId) ids.add(block.assetId);
    if (block.type === "gallery") for (const entry of block.images) if (entry.assetId) ids.add(entry.assetId);
  });
  return [...ids];
}

export function validateResourceForPublication(doc: ResourceDocument): string | null {
  const parsed = resourceDocumentSchema.safeParse(doc);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Vérifiez le contenu de la page.";
  if (!doc.blocks.length) return "Ajoutez du contenu avant de publier cette page.";
  let error: string | null = null;
  visitResourceBlocks(doc.blocks, (block) => {
    if (error) return;
    if ((block.type === "text" || block.type === "heading") && !block.text.trim()) error = "Complétez ou retirez les blocs de texte vides.";
    if (block.type === "image" && (!block.assetId || !block.alt.trim())) error = "Ajoutez une image et sa description pour l’accessibilité.";
    if (block.type === "gallery" && (!block.images.length || block.images.some((item) => !item.assetId || !item.alt.trim()))) error = "Complétez les images et leurs descriptions dans la galerie.";
    if (block.type === "link" && (!safeResourceLink(block.url) || !block.label.trim())) error = "Complétez le lien et son libellé.";
    if (block.type === "file" && (!block.assetId || !block.label.trim())) error = "Choisissez le fichier à télécharger et son libellé.";
    if (block.type === "video" && (!resourceVideoEmbed(block.url) || !block.title.trim())) error = "Ajoutez un lien YouTube ou Vimeo valide et un titre à la vidéo.";
    if (block.type === "columns" && block.columns.every((column) => !column.length)) error = "Ajoutez du contenu dans les colonnes ou retirez ce bloc.";
  });
  return error;
}

export function resourceAssetUrl(id: string, download = false): string {
  return `/api/resources/assets/${encodeURIComponent(id)}${download ? "?download=1" : ""}`;
}

const uploadTypes: Record<string, string[]> = {
  jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], webp: ["image/webp"], gif: ["image/gif"],
  pdf: ["application/pdf"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], csv: ["text/csv", "application/vnd.ms-excel"], txt: ["text/plain"],
};

export function resourceUploadMime(name: string, mime: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = uploadTypes[ext];
  if (!allowed || (mime && mime.toLowerCase() !== "application/octet-stream" && !allowed.includes(mime.toLowerCase()))) return null;
  return allowed[0];
}

export function allowedResourceUpload(name: string, mime: string, size: number): boolean {
  return name.length > 0 && name.length <= 200 && !/[\u0000-\u001f\u007f/\\]/.test(name) && Number.isSafeInteger(size) && size > 0 && size <= RESOURCE_UPLOAD_MAX_BYTES && resourceUploadMime(name, mime) !== null;
}
