import { randomUUID } from "node:crypto";
import { hasSupabaseEnv } from "@/lib/env";
import { allowedResourceUpload, resourceUploadMime, RESOURCE_UPLOAD_MAX_BYTES } from "@/lib/resources";
import { canEditResources, isResourceId } from "@/lib/resources-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" };
const fail = (message: string, status: number) => Response.json({ ok: false, message }, { status, headers });

function matchesSignature(bytes: Uint8Array, mime: string): boolean {
  const starts = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (mime === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mime === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (mime === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (mime === "application/pdf") return ascii(0, 5) === "%PDF-";
  if (mime.includes("openxmlformats")) {
    // Office Open XML stores names in the ZIP central directory, without having
    // to decompress untrusted content. Macro-enabled archives are not accepted.
    if (!starts(0x50, 0x4b, 0x03, 0x04)) return false;
    const content = new TextDecoder("latin1").decode(bytes);
    return content.includes("[Content_Types].xml") && !/vbaProject\.bin/i.test(content)
      && content.includes(mime.includes("wordprocessingml") ? "word/document.xml" : "xl/workbook.xml");
  }
  if (mime === "text/plain" || mime === "text/csv") {
    try { return !new TextDecoder("utf-8", { fatal: true }).decode(bytes).includes("\0"); }
    catch { return false; }
  }
  return false;
}

async function boundedFormData(request: Request): Promise<FormData | null> {
  const limit = RESOURCE_UPLOAD_MAX_BYTES + 65536;
  const length = request.headers.get("content-length");
  if (length && Number(length) > limit) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > limit) { await reader.cancel(); return null; }
      chunks.push(new Uint8Array(chunk.value));
    }
  } finally { reader.releaseLock(); }
  return new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: new Blob(chunks) }).formData();
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return fail("L’import nécessite une connexion à TaDiff.", 503);
  // Protect this cookie-authenticated route against cross-origin form submissions.
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return fail("Cette demande n’est pas autorisée.", 403);
  if (!await canEditResources()) return fail("Vous n’avez pas l’autorisation d’importer des fichiers.", 403);
  try {
    const form = await boundedFormData(request);
    if (!form) return fail("Le fichier dépasse la limite de 4 Mo.", 413);
    const pageId = form.get("pageId");
    const file = form.get("file");
    if (!isResourceId(pageId) || !(file instanceof File)) return fail("Choisissez un fichier et enregistrez d’abord la page.", 400);
    const name = file.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim() ?? "";
    if (!name || name.length > 240 || !allowedResourceUpload(name, file.type, file.size)) return fail("Format non accepté. Utilisez une image JPG, PNG, WebP ou GIF, un PDF, DOCX, XLSX, CSV ou TXT de 4 Mo maximum.", 400);
    const mime = resourceUploadMime(name, file.type);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!mime || !matchesSignature(bytes, mime)) return fail("Le contenu du fichier ne correspond pas à son format, ou son encodage texte n’est pas UTF-8.", 400);
    const db = await getSupabaseServerClient();
    const page = await db.from("resource_pages").select("id").eq("id", pageId).maybeSingle();
    if (page.error || !page.data) return fail("Enregistrez d’abord le brouillon de cette page, puis réessayez l’import.", 400);
    const id = randomUUID();
    const path = `${pageId}/${id}.${name.split(".").pop()!.toLowerCase()}`;
    const bucket = db.storage.from("resource-media");
    const upload = await bucket.upload(path, bytes, { contentType: mime, cacheControl: "0", upsert: false });
    if (upload.error) return fail("Le fichier n’a pas été importé. Vérifiez la connexion et l’installation de l’espace ressources.", 503);
    const { data, error } = await db.from("resource_assets").insert({ id, page_id: pageId, name, mime_type: mime, size: file.size, storage_path: path }).select("id,page_id,name,mime_type,size,storage_path,created_at").single();
    if (error || !data) {
      await bucket.remove([path]);
      return fail("L’import du fichier n’a pas pu être confirmé. Réessayez.", 503);
    }
    return Response.json({ ok: true, asset: data }, { status: 201, headers });
  } catch { return fail("L’import a été interrompu. Vérifiez le fichier et réessayez.", 400); }
}
