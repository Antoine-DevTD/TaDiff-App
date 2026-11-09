import { hasSupabaseEnv } from "@/lib/env";
import { isResourceId } from "@/lib/resources-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, noarchive" };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const unavailable = () => new Response("Fichier introuvable ou accès non autorisé.", { status: 404, headers: privateHeaders });
  if (!hasSupabaseEnv()) return new Response("Les fichiers sont momentanément indisponibles.", { status: 503, headers: privateHeaders });
  const { id } = await context.params;
  if (!isResourceId(id)) return unavailable();
  try {
    const db = await getSupabaseServerClient();
    // Both the metadata request and Storage download use the current user's
    // client and RLS. There is no service-role client and no reusable signed URL.
    const { data: asset, error } = await db.from("resource_assets").select("id,name,mime_type,storage_path").eq("id", id).maybeSingle();
    if (error || !asset) return unavailable();
    const { data, error: storageError } = await db.storage.from("resource-media").download(asset.storage_path);
    if (storageError || !data) return unavailable();
    // Recheck after download as well, to honor withdrawal while bytes were fetched.
    const permission = await db.from("resource_assets").select("id").eq("id", id).maybeSingle();
    if (permission.error || !permission.data) return unavailable();
    const inline = new URL(request.url).searchParams.get("download") !== "1" && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(asset.mime_type);
    const ascii = asset.name.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 160) || "ressource";
    const encoded = encodeURIComponent(asset.name).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(data, { headers: { ...privateHeaders, "Content-Type": asset.mime_type, "Content-Length": String(data.size), "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encoded}`, "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch { return unavailable(); }
}
